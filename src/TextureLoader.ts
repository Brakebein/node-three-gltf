import { Loader, LoadingManager, Texture } from 'three';
import { ImageLoader } from './ImageLoader';

export class TextureLoader extends Loader {

	constructor( manager?: LoadingManager ) {

		super( manager );

	}

	load( url: string, onLoad?: (texture: Texture) => void, onProgress?: () => void, onError?: (err: Error) => void ): Texture {

		const texture = new Texture();

		const loader = new ImageLoader( this.manager );
		loader.setCrossOrigin( this.crossOrigin );
		loader.setPath( this.path );

		loader.load( url, function ( image ) {

			texture.image = image;
			texture.needsUpdate = true;

			if ( onLoad !== undefined ) {

				onLoad( texture );

			}

		}, onProgress, onError );

		return texture;

	}

}
