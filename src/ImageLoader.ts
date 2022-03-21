import { resolveObjectURL } from 'buffer';
import { Cache, Loader, LoadingManager } from 'three';
import Jimp from 'jimp';

export class ImageLoader extends Loader {

	constructor( manager?: LoadingManager ) {

		super( manager );

	}

	load( url: string, onLoad?: (image) => void, onProgress?: () => void, onError?: (err: Error) => void ) {

		if ( this.path !== undefined ) url = this.path + url;

		url = this.manager.resolveURL( url );

		const scope = this;

		const cached = Cache.get( url );

		if ( cached !== undefined ) {

			scope.manager.itemStart( url );

			setTimeout( function () {

				if ( onLoad ) onLoad( cached );

				scope.manager.itemEnd( url );

			}, 0 );

			return cached;

		}

		scope.manager.itemStart( url );

		Promise.resolve()
			.then(async () => {

				if (/^blob:.*$/i.test(url)) {

					const blob = resolveObjectURL(url);
					const imageBuffer = Buffer.from(await blob.arrayBuffer());
					return Jimp.read(imageBuffer).then(image => image.bitmap) as Promise<ArrayBuffer>;

				} else if (/^data:/.test(url)) {

					const imageBuffer =  Buffer.from(url.split(',')[1], 'base64');
					return Jimp.read(imageBuffer).then(image => image.bitmap) as Promise<ArrayBuffer>;

				} else {

					return Jimp.read(url).then(image => image.bitmap) as Promise<ArrayBuffer>;

				}

			})
			.then(data => {

				Cache.add( url, data );

				if ( onLoad ) onLoad( data );

				scope.manager.itemEnd( url );

			})
			.catch(err => {

				if ( onError ) onError( err );

				scope.manager.itemError( url );
				scope.manager.itemEnd( url );

			});

	}

}
