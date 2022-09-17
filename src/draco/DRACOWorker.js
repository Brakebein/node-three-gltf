import { parentPort } from 'node:worker_threads';

let decoderConfig;
let decoderPending;

parentPort.on('message', ( message ) => {

  switch ( message.type ) {

    case 'init':
      decoderConfig = message.decoderConfig;
      decoderPending = new Promise( function ( resolve/*, reject*/ ) {

        decoderConfig.onModuleLoaded = function ( draco ) {

          // Module is Promise-like. Wrap before resolving to avoid loop.
          resolve( { draco: draco } );

        };

        DracoDecoderModule( decoderConfig ); // eslint-disable-line no-undef

      } );
      break;

    case 'decode':
      const buffer = message.buffer;
      const taskConfig = message.taskConfig;
      decoderPending.then( ( module ) => {

        const draco = module.draco;
        const decoder = new draco.Decoder();
        const decoderBuffer = new draco.DecoderBuffer();
        decoderBuffer.Init( new Int8Array( buffer ), buffer.byteLength );

        try {

          const geometry = decodeGeometry( draco, decoder, decoderBuffer, taskConfig );

          const buffers = geometry.attributes.map( ( attr ) => attr.array.buffer );

          if ( geometry.index ) buffers.push( geometry.index.array.buffer );

          parentPort.postMessage( { type: 'decode', id: message.id, geometry }, buffers );

        } catch ( error ) {

          parentPort.postMessage( { type: 'error', id: message.id, error: error.message } );

        } finally {

          draco.destroy( decoderBuffer );
          draco.destroy( decoder );

        }

      } );
      break;

  }

} );

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
  for ( const attributeName in attributeIDs ) {

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
    array: array,
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
