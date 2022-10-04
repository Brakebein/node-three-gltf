import { resolveObjectURL } from 'node:buffer';
import { Cache, Loader, LoadingManager } from 'three';
import sharp from 'sharp';
import fetch, { Headers, Request } from 'node-fetch';

export class ImageLoader extends Loader {

	constructor( manager?: LoadingManager ) {

		super( manager );

	}

	load( url: string, onLoad?: (image: ArrayBuffer) => void, onProgress?: () => void, onError?: (err: Error) => void ) {

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

		}

		scope.manager.itemStart( url );

		Promise.resolve()
			.then(async () => {

				if (/^blob:.*$/i.test(url)) {

					const blob = resolveObjectURL(url);
					const imageBuffer = Buffer.from(await blob.arrayBuffer());
					return sharp(imageBuffer);

				} else if (/^data:/.test(url)) {

					const base64 = url.split(';base64,').pop();
					const imageBuffer = Buffer.from(base64, 'base64');
					return sharp(imageBuffer);

				} else if (/^https?:\/\//.test(url)) {

					const req = new Request(url, {
						headers: new Headers(this.requestHeader),
						// @ts-ignore
						credentials: this.withCredentials ? 'include' : 'same-origin',
						// An abort controller could be added within a future PR
					});

					const response = await fetch(req);
					const buffer = Buffer.from(await response.arrayBuffer());

					return sharp(buffer);

				} else {

					// file path
					return sharp(url);

				}

			})
			.then(image => image
					.ensureAlpha()
					.raw()
					.toBuffer({ resolveWithObject: true })
			)
			.then(({ data, info }) => ({
				data,
				width: info.width,
				height: info.height,
			} as unknown as ArrayBuffer))
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
