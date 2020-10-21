/*
 * speedy-vision.js
 * GPU-accelerated Computer Vision for JavaScript
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
 * matrix-math.js
 * Linear algebra routines
 */

//! No imports here

/**
 * Matrix math routines
 * All routines are stateless
 */
class MatrixMath
{
    /**
     * No-operation
     * @param {object} header properties of the output matrix
     * @param {TypedArray} output output buffer (column-major format)
     * @param {TypedArray[]} inputs input buffer(s), 0 or more
     */
    static nop(header, output, inputs)
    {
        ;
    }

    // Set to identity matrix
    static eye(header, output, inputs)
    {
        const { rows, columns, stride } = header;

        // set to zeroes
        output.fill(0);

        /*
        // multi-channel matrices
        const channels = 1 + (type & 3);
        for(let j = 0; j < m; j++) {
            for(let c = 0; c < channels; c++)
                output[(j * stride + j) * channels + c] = 1;
        }
        */

        // set the main diagonal
        const m = Math.min(rows, columns);
        for(let j = 0; j < m; j++)
            output[j * stride + j] = 1;
    }

    // Fill matrix with a constant
    static fill(header, output, inputs)
    {
        // FIXME: what if stride != rows? two cases ...
        output.fill(header.custom.value);
    }

    // Transpose matrix
    static transpose(header, output, inputs)
    {
        const { rows, columns, stride } = header;
        const strideT = header.strideOfInputs[0];
        const input = inputs[0];

        for(let i = 0; i < rows; i++) {
            for(let j = 0; j < columns; j++)
                output[j * stride + i] = input[i * strideT + j];
        }
    }

    // Add two matrices
    static add(header, output, inputs)
    {
        const { rows, columns, stride } = header;
        const [ strideA, strideB ] = header.strideOfInputs;
        const [ a, b ] = inputs;

        for(let j = 0; j < columns; j++) {
            for(let i = 0; i < rows; i++)
                output[j * stride + i] = a[j * strideA + i] + b[j * strideB + i];
        }
    }





    // ========================================================
    // Enums & utilities
    // ========================================================

    /**
     * Types of matrices
     * @returns {object} enum
     */
    static get MatrixType()
    {
        return this._MatrixType || (this._MatrixType = Object.freeze({
            F32: 0x0,         // 32-bit float, 1 channel
            //F32C1: 0x0 | 0x0, // 32-bit float, 1 channel
            //F32C2: 0x0 | 0x1, // 32-bit float, 2 channels
            //F32C3: 0x0 | 0x2, // 32-bit float, 3 channels
            //F32C4: 0x0 | 0x3, // 32-bit float, 4 channels
            F64: 0x4,         // 64-bit float, 1 channel
            //F64C1: 0x4 | 0x0, // 64-bit float, 1 channel
            //F64C2: 0x4 | 0x1, // 64-bit float, 2 channels
            //F64C3: 0x4 | 0x2, // 64-bit float, 3 channels
            //F64C4: 0x4 | 0x3, // 64-bit float, 4 channels
            I32: 0x8,         // 32-bit signed integer, 1 channel
            //I32C1: 0x8 | 0x0, // 32-bit signed integer, 1 channel
            //I32C2: 0x8 | 0x1, // 32-bit signed integer, 2 channels
            //I32C3: 0x8 | 0x2, // 32-bit signed integer, 3 channels
            //I32C4: 0x8 | 0x3, // 32-bit signed integer, 4 channels
            U8: 0xC,          // 8-bit unsigned integer, 1 channel
            //U8C1: 0xC | 0x0,  // 8-bit unsigned integer, 1 channel
            //U8C2: 0xC | 0x1,  // 8-bit unsigned integer, 2 channels
            //U8C3: 0xC | 0x2,  // 8-bit unsigned integer, 3 channels
            //U8C4: 0xC | 0x3,  // 8-bit unsigned integer, 4 channels
        }));
    }

    /**
     * A mapping between MatrixTypes and TypedArrays
     * @returns {object}
     */
    static get DataType()
    {
        return this._DataType || (this._DataType = Object.freeze({
            [this.MatrixType.F32]: Float32Array,
            [this.MatrixType.F64]: Float64Array,
            [this.MatrixType.I32]: Int32Array,
            [this.MatrixType.U8]:  Uint8Array,
        }));
    }

    /**
     * A mapping between MatrixTypes and descriptive strings
     * @returns {object}
     */
    static get DataTypeName()
    {
        return this._DataTypeName || (this._DataTypeName = Object.freeze({
            [this.MatrixType.F32]: 'float32',
            [this.MatrixType.F64]: 'float64',
            [this.MatrixType.I32]: 'int32',
            [this.MatrixType.U8]:  'uint8',
        }));
    }

    /**
     * Each operation is mapped to a unique number, called an operation code
     * @returns {object}
     */
    static get Opcode()
    {
        return this._Opcode || (this._Opcode = Object.freeze({
            NOP: 0x0,        // no-operation
            EYE: 0x1,        // identity matrix
            FILL: 0x2,       // fill the matrix with a constant
            TRANSPOSE: 0x3,  // transpose matrix
            ADD: 0x4,        // add two matrices
        }));
    }

    /**
     * A mapping between operation codes and functions
     * @returns {object}
     */
    static get Opcode2fun()
    {
        return this._Opcode2fun || (this._Opcode2fun = Object.freeze({
            [this.Opcode.NOP]: this.nop,
            [this.Opcode.EYE]: this.eye,
            [this.Opcode.FILL]: this.fill,
            [this.Opcode.TRANSPOSE]: this.transpose,
            [this.Opcode.ADD]: this.add,
        }));
    }
}

module.exports = { MatrixMath };