/*
 * speedy-features.js
 * GPU-accelerated feature detection and matching for Computer Vision on the web
 * Copyright 2020 Alexandre Martins <alemartf(at)gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * gpu-kernels.js
 * The set of all GPU kernel groups for accelerated computer vision
 */

import { GPU } from './gpu-browser';
import { Utils } from '../utils/utils';
import { GPUColors } from './gpu-colors';
import { GPUFilters } from './gpu-filters';
import { GPUKeypoints } from './gpu-keypoints';
import { GPUEncoders } from './gpu-encoders';
import { GPUPyramids } from './gpu-pyramids';

// Texture limits
const MAX_TEXTURE_LENGTH = 65534; // 2^n - 2 due to encoding


/**
 * The set of all GPU kernel groups for
 * accelerated computer vision
 */
export class GPUKernels
{
    /**
     * Class constructor
     * @param {number} width Texture width
     * @param {number} height Texture height
     */
    constructor(width, height)
    {
        // read & validate texture size
        this._width = +width | 0;
        this._height = +height | 0;
        if(this._width > MAX_TEXTURE_LENGTH || this._height > MAX_TEXTURE_LENGTH) {
            Utils.warning('Maximum texture size exceeded.');
            this._width = Math.min(this._width, MAX_TEXTURE_LENGTH);
            this._height = Math.min(this._height, MAX_TEXTURE_LENGTH);
        }

        // create GPU
        this._canvas = createCanvas(this._width, this._height);
        this._gpu = new GPU({
            canvas: this._canvas,
            context: this._canvas.getContext('webgl2', { premultipliedAlpha: true }) // we're using alpha
        });

        // spawn kernels
        this._colors = new GPUColors(this._gpu, this._width, this._height);
        this._filters = new GPUFilters(this._gpu, this._width, this._height);
        this._keypoints = new GPUKeypoints(this._gpu, this._width, this._height);
        this._encoders = new GPUEncoders(this._gpu, this._width, this._height);
        this._pyramids = new GPUPyramids(this._gpu, this._width, this._height);
    }

    /**
     * Colors kernel group
     */
    get colors()
    {
        return this._colors;
    }

    /**
     * Filters kernel group
     */
    get filters()
    {
        return this._filters;
    }

    /**
     * Keypoints kernel group
     */
    get keypoints()
    {
        return this._keypoints;
    }

    /**
     * Encoders kernel group
     */
    get encoders()
    {
        return this._encoders;
    }
}

// Create a canvas
function createCanvas(width, height)
{
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}