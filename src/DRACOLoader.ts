import {
	BufferAttribute,
	BufferGeometry,
	Loader, LoadingManager
} from 'three';
import { createDecoderModule } from 'draco3dgltf';
import { FileLoader } from './FileLoader';

const _taskCache = new WeakMap();

export class DRACOLoader extends Loader {

	decoderConfig = {};

	defaultAttributeIDs = {
		position: 'POSITION',
		normal: 'NORMAL',
		color: 'COLOR',
		uv: 'TEX_COORD'
	};
	defaultAttributeTypes = {
		position: 'Float32Array',
		normal: 'Float32Array',
		color: 'Float32Array',
		uv: 'Float32Array'
	};

	constructor( manager?: LoadingManager ) {

		super( manager );

	}

	setDecoderConfig( config: object ) {

		this.decoderConfig = config;

		return this;

	}

	load( url: string, onLoad: (geometry: BufferGeometry) => void, onProgress?: () => void, onError?: (err: Error) => void ) {

		const loader = new FileLoader( this.manager );

		loader.setPath( this.path );
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );

		loader.load( url, ( buffer ) => {

			const taskConfig = {
				attributeIDs: this.defaultAttributeIDs,
				attributeTypes: this.defaultAttributeTypes,
				useUniqueIDs: false
			};

			// @ts-ignore
			this.decodeGeometry( buffer, taskConfig )
				.then( onLoad )
				.catch( onError );

		}, onProgress, onError );

	}

	/** @deprecated Kept for backward-compatibility with previous DRACOLoader versions. */
	decodeDracoFile( buffer: ArrayBuffer, callback: (geometry: BufferGeometry) => void, attributeIDs?, attributeTypes? ) {

		const taskConfig = {
			attributeIDs: attributeIDs || this.defaultAttributeIDs,
			attributeTypes: attributeTypes || this.defaultAttributeTypes,
			useUniqueIDs: !! attributeIDs
		};

		this.decodeGeometry( buffer, taskConfig ).then( callback );

	}

	decodeGeometry( buffer: ArrayBuffer, taskConfig ): Promise<BufferGeometry> {

		// TODO: For backward-compatibility, support 'attributeTypes' objects containing
		// references (rather than names) to typed array constructors. These must be
		// serialized before sending them to the worker.
		for ( const attribute of Object.keys(taskConfig.attributeTypes) ) {

			const type = taskConfig.attributeTypes[ attribute ];

			if ( type.BYTES_PER_ELEMENT !== undefined ) {

				taskConfig.attributeTypes[ attribute ] = type.name;

			}

		}

		//

		const taskKey = JSON.stringify( taskConfig );

		// Check for an existing task using this buffer. A transferred buffer cannot be transferred
		// again from this thread.
		if ( _taskCache.has( buffer ) ) {

			const cachedTask = _taskCache.get( buffer );

			if ( cachedTask.key === taskKey ) {

				return cachedTask.promise;

			} else if ( buffer.byteLength === 0 ) {

				// Technically, it would be possible to wait for the previous task to complete,
				// transfer the buffer back, and decode again with the second configuration. That
				// is complex, and I don't know of any reason to decode a Draco buffer twice in
				// different ways, so this is left unimplemented.
				throw new Error(

					'THREE.DRACOLoader: Unable to re-decode a buffer with different ' +
					'settings. Buffer has already been transferred.'

				);

			}

		}

		const geometryPending = new Promise<BufferGeometry>(async (resolve, reject) => {

			const draco = await createDecoderModule(this.decoderConfig);
			const decoder = new draco.Decoder();
			const decoderBuffer = new draco.DecoderBuffer();
			decoderBuffer.Init( new Int8Array( buffer ), buffer.byteLength );

			try {

				const geometry = decodeGeometry( draco, decoder, decoderBuffer, taskConfig );

				const buffers = geometry.attributes.map( ( attr ) => attr.array.buffer );

				if ( geometry.index ) buffers.push( geometry.index.array.buffer );

				resolve( this._createGeometry( geometry ) );

			} catch ( error ) {

				console.error( error );

				reject( error );

			} finally {

				draco.destroy( decoderBuffer );
				draco.destroy( decoder );

			}

		});

		// Cache the task result.
		_taskCache.set( buffer, {

			key: taskKey,
			promise: geometryPending

		} );

		return geometryPending;

	}

	_createGeometry( geometryData ): BufferGeometry {

		const geometry = new BufferGeometry();

		if ( geometryData.index ) {

			geometry.setIndex( new BufferAttribute( geometryData.index.array, 1 ) );

		}

		for ( const attribute of geometryData.attributes ) {

			const name = attribute.name;
			const array = attribute.array;
			const itemSize = attribute.itemSize;

			geometry.setAttribute( name, new BufferAttribute( array, itemSize ) );

		}

		return geometry;

	}

	preload(): DRACOLoader {

		return this;

	}

}

function decodeGeometry( draco, decoder, decoderBuffer, taskConfig ) {

	const attributeIDs = taskConfig.attributeIDs;
	const attributeTypes = taskConfig.attributeTypes;

	let dracoGeometry;
	let decodingStatus;

	const geometryType = decoder.GetEncodedGeometryType( decoderBuffer );

	if ( geometryType === draco.TRIANGULAR_MESH ) {

		dracoGeometry = new draco.Mesh();
		decodingStatus = decoder.DecodeBufferToMesh( decoderBuffer, dracoGeometry );

	} else if ( geometryType === draco.POINT_CLOUD ) {

		dracoGeometry = new draco.PointCloud();
		decodingStatus = decoder.DecodeBufferToPointCloud( decoderBuffer, dracoGeometry );

	} else {

		throw new Error( 'THREE.DRACOLoader: Unexpected geometry type.' );

	}

	if ( ! decodingStatus.ok() || dracoGeometry.ptr === 0 ) {

		throw new Error( 'THREE.DRACOLoader: Decoding failed: ' + decodingStatus.error_msg() );

	}

	const geometry = { index: null, attributes: [] };

	// Gather all vertex attributes.
	for ( const attributeName of Object.keys(attributeIDs) ) {

		const attributeType = global[ attributeTypes[ attributeName ] ];

		let attribute;
		let attributeID;

		// A Draco file may be created with default vertex attributes, whose attribute IDs
		// are mapped 1:1 from their semantic name (POSITION, NORMAL, ...). Alternatively,
		// a Draco file may contain a custom set of attributes, identified by known unique
		// IDs. glTF files always do the latter, and `.drc` files typically do the former.
		if ( taskConfig.useUniqueIDs ) {

			attributeID = attributeIDs[ attributeName ];
			attribute = decoder.GetAttributeByUniqueId( dracoGeometry, attributeID );

		} else {

			attributeID = decoder.GetAttributeId( dracoGeometry, draco[ attributeIDs[ attributeName ] ] );

			if ( attributeID === - 1 ) continue;

			attribute = decoder.GetAttribute( dracoGeometry, attributeID );

		}

		geometry.attributes.push( decodeAttribute( draco, decoder, dracoGeometry, attributeName, attributeType, attribute ) );

	}

	// Add index.
	if ( geometryType === draco.TRIANGULAR_MESH ) {

		geometry.index = decodeIndex( draco, decoder, dracoGeometry );

	}

	draco.destroy( dracoGeometry );

	return geometry;

}

function decodeIndex( draco, decoder, dracoGeometry ) {

	const numFaces = dracoGeometry.num_faces();
	const numIndices = numFaces * 3;
	const byteLength = numIndices * 4;

	const ptr = draco._malloc( byteLength );
	decoder.GetTrianglesUInt32Array( dracoGeometry, byteLength, ptr );
	const index = new Uint32Array( draco.HEAPF32.buffer, ptr, numIndices ).slice();
	draco._free( ptr );

	return { array: index, itemSize: 1 };

}

function decodeAttribute( draco, decoder, dracoGeometry, attributeName, attributeType, attribute ) {

	const numComponents = attribute.num_components();
	const numPoints = dracoGeometry.num_points();
	const numValues = numPoints * numComponents;
	const byteLength = numValues * attributeType.BYTES_PER_ELEMENT;
	const dataType = getDracoDataType( draco, attributeType );

	const ptr = draco._malloc( byteLength );
	decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, dataType, byteLength, ptr );
	const array = new attributeType( draco.HEAPF32.buffer, ptr, numValues ).slice();
	draco._free( ptr );

	return {
		name: attributeName,
		array,
		itemSize: numComponents
	};

}

function getDracoDataType( draco, attributeType ) {

	switch ( attributeType ) {

		case Float32Array: return draco.DT_FLOAT32;
		case Int8Array: return draco.DT_INT8;
		case Int16Array: return draco.DT_INT16;
		case Int32Array: return draco.DT_INT32;
		case Uint8Array: return draco.DT_UINT8;
		case Uint16Array: return draco.DT_UINT16;
		case Uint32Array: return draco.DT_UINT32;

	}

}
