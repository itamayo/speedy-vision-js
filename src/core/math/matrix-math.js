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
    // ========================================================
    // Math routines
    // ========================================================

    /**
     * No-operation
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static nop(header, output, inputs)
    {
        ;
    }

    /**
     * Fill the matrix with a constant value
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static fill(header, output, inputs)
    {
        const { rows, columns, stride, length } = header;
        const { value } = header.custom;

        // use a memset-like operation if possible
        if(rows * columns == length) {
            output.fill(value, 0, length);
            return;
        }

        // fill the columns one by one
        for(let j = 0; j < columns; j++)
            output.fill(value, j * stride, j * stride + rows);
    }

    /**
     * Copy matrix
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static copy(header, output, inputs)
    {
        const { rows, columns, stride, length } = header;
        const [ strideI ] = header.strideOfInputs;
        const [ input ] = inputs;

        // use a memcpy-like operation if possible
        if(length == header.lengthOfInputs[0] && rows * columns == length) {
            output.set(input, 0, length);
            return;
        }

        // copy values one by one
        let i, j, oj, ij;
        for(oj = ij = j = 0; j < columns; j++, oj += stride, ij += strideI) {
            for(i = 0; i < rows; i++)
                output[oj + i] = input[ij + i];
        }
    }

    /**
     * Transpose matrix
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static transpose(header, output, inputs)
    {
        const { rows, columns, stride } = header;
        const [ strideT ] = header.strideOfInputs;
        const [ input ] = inputs;

        let i, j, ii, oj;
        for(ii = i = 0; i < rows; i++, ii += strideT) {
            for(oj = j = 0; j < columns; j++, oj += stride)
                output[oj + i] = input[ii + j];
        }
    }

    /**
     * Add two matrices
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static add(header, output, inputs)
    {
        const { rows, columns, stride } = header;
        const [ strideA, strideB ] = header.strideOfInputs;
        const [ a, b ] = inputs;

        let i, j, oj, aj, bj;
        for(j = 0; j < columns; j++) {
            oj = j * stride;
            aj = j * strideA;
            bj = j * strideB;
            for(i = 0; i < rows; i++)
                output[oj + i] = a[aj + i] + b[bj + i];
        }
    }

    /**
     * Subtract two matrices
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static subtract(header, output, inputs)
    {
        const { rows, columns, stride } = header;
        const [ strideA, strideB ] = header.strideOfInputs;
        const [ a, b ] = inputs;

        let i, j, oj, aj, bj;
        for(j = 0; j < columns; j++) {
            oj = j * stride;
            aj = j * strideA;
            bj = j * strideB;
            for(i = 0; i < rows; i++)
                output[oj + i] = a[aj + i] - b[bj + i];
        }
    }

    /**
     * Multiply two matrices (e.g., C = A B)
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static multiply(header, output, inputs)
    {
        const { rows, columns, stride, length } = header;
        const [ columnsA, columnsB ] = header.columnsOfInputs;
        const [ strideA, strideB ] = header.strideOfInputs;
        const [ a, b ] = inputs;

        // clear matrix
        if(rows * columns != length) {
            for(let c = 0; c < columns; c++)
                output.fill(0, c * stride, c * stride + rows);
        }
        else
            output.fill(0, 0, length);

        // multiply taking cache locality into account
        let i, j, k, ok, aj, bk, bjk;
        for(ok = bk = k = 0; k < columnsB; k++, ok += stride, bk += strideB) {
            for(aj = j = 0; j < columnsA; j++, aj += strideA) {
                bjk = b[bk + j];
                for(i = 0; i < rows; i++)
                    output[ok + i] += a[aj + i] * bjk;
            }
        }
    }

    /**
     * Multiply two matrices, transposing the left operand
     * (e.g., C = A^T B)
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static multiplylt(header, output, inputs)
    {
        const { rows, columns, stride, length } = header;
        const [ columnsA, columnsB ] = header.columnsOfInputs;
        const [ rowsA, rowsB ] = header.rowsOfInputs;
        const [ strideA, strideB ] = header.strideOfInputs;
        const [ a, b ] = inputs;

        // multiply taking cache locality into account
        let i, j, k, aj, bk, ok, ojk;
        for(ok = bk = k = 0; k < columnsB; k++, ok += stride, bk += strideB) {
            for(aj = j = 0; j < columnsA; j++, aj += strideA) {
                output[ojk = ok + j] = 0;
                for(i = 0; i < rowsB; i++)
                    output[ojk] += a[aj + i] * b[bk + i];
            }
        }
    }

    /**
     * Multiply two matrices, transposing the right operand
     * (e.g., C = A B^T)
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static multiplyrt(header, output, inputs)
    {
        const { rows, columns, stride, length } = header;
        const [ columnsA, columnsB ] = header.columnsOfInputs;
        const [ rowsA, rowsB ] = header.rowsOfInputs;
        const [ strideA, strideB ] = header.strideOfInputs;
        const [ a, b ] = inputs;

        // clear matrix
        if(rows * columns != length) {
            for(let c = 0; c < columns; c++)
                output.fill(0, c * stride, c * stride + rows);
        }
        else
            output.fill(0, 0, length);

        // multiply taking cache locality into account
        let i, j, k, ok, aj, bj, bkj;
        for(aj = bj = j = 0; j < columnsA; j++, aj += strideA, bj += strideB) {
            for(ok = k = 0; k < rowsB; k++, ok += stride) {
                bkj = b[bj + k];
                for(i = 0; i < rows; i++)
                    output[ok + i] += a[aj + i] * bkj;
            }
        }
    }

    /**
     * Multiply by a constant
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static scale(header, output, inputs)
    {
        const { rows, columns, stride } = header;
        const { scalar } = header.custom;
        const [ input ] = inputs;

        let i, j, oj;
        for(j = 0; j < columns; j++) {
            oj = j * stride;
            for(i = 0; i < rows; i++)
                output[oj + i] = input[oj + i] * scalar;
        }
    }

    /**
     * Component-wise multiplication
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     */
    static compmult(header, output, inputs)
    {
        const { rows, columns, stride } = header;
        const [ strideA, strideB ] = header.strideOfInputs;
        const [ a, b ] = inputs;

        let i, j, oj, aj, bj;
        for(j = 0; j < columns; j++) {
            oj = j * stride;
            aj = j * strideA;
            bj = j * strideB;
            for(i = 0; i < rows; i++)
                output[oj + i] = a[aj + i] * b[bj + i];
        }
    }

    /**
     * Outer product (m x 1 vector by 1 x n vector)
     * @param {object} header 
     * @param {TypedArray} output 
     * @param {TypedArray[]} inputs 
     */
    static outer(header, output, inputs)
    {
        const { rows, columns, stride } = header;
        const [ strideA, strideB ] = header.strideOfInputs;
        const [ a, b ] = inputs;       

        let i, j, bj, oj;
        for(j = 0; j < columns; j++) {
            bj = b[j * strideB];
            oj = j * stride;
            for(i = 0; i < rows; i++)
                output[oj + i] = a[i] * bj;
        }
    }

    /**
     * QR decomposition
     * @param {object} header
     * @param {TypedArray} output becomes [ Q | R ]
     * @param {TypedArray[]} inputs
     */
    static qr(header, output, inputs)
    {
        const { stride, type } = header;
        const [ irows ] = header.rowsOfInputs;
        const [ icolumns ] = header.columnsOfInputs;
        const [ istride ] = header.strideOfInputs;
        const [ input, x ] = inputs;
        const { mode } = header.custom;
        const [ orows, ocolumns ] = [ header.rows, header.columns ];
        const subheader = Object.assign(header, { custom: null });
        const wantMatrices = (mode == 'full-qr' || mode == 'reduced-qr');

        // create temporary storage
        const num = wantMatrices ? 2 : 3;
        const storage = this._createTypedArray(num * irows * icolumns + icolumns, type);
        const reflect = storage.subarray(0, irows * icolumns);
        const tmprow = storage.subarray(irows * icolumns, irows * icolumns + icolumns);
        const tmp = storage.subarray(irows * icolumns + icolumns, 2 * irows * icolumns + icolumns);

        // create soon-to-be upper triangular matrix R
        const rstride = wantMatrices ? stride : irows;
        const triangular = !wantMatrices ? storage.subarray(2 * irows * icolumns + icolumns) :
            output.subarray(((mode == 'reduced-qr') ? icolumns : irows) * rstride);

        // input matrix is m x n and should be such that m >= n
        if(irows < icolumns)
            throw new Error(`Can't compute the QR decomposition of a ${irows} x ${icolumns} matrix`);

        // copy input[:,:] to triangular[:,:]
        if(input.length != triangular.length) {
            submatrices = this._submatrices(subheader, triangular, [ input ], rstride, [ istride ],
                [ 0, irows-1, 0, icolumns-1 ],
                [[ 0, irows-1, 0, icolumns-1 ]]
            );
            this.copy(submatrices.header, submatrices.output, submatrices.inputs);
        }
        else
            triangular.set(input, 0, input.length);

        // Compute the reflection vectors and the upper triangular matrix R
        let i, j, k, n, norm, sign, fkk, rkk, submatrices;
        for(k = 0; k < icolumns; k++) {
            fkk = k * irows + k; // reflector index
            rkk = k * rstride + k; // upper-triangular R

            n = irows - k; // the k-th reflection vector has n components
            sign = (+(triangular[rkk] >= 0)) - (+(triangular[rkk] < 0)); // sign(triangular[k,k]) is +1 or -1

            // use reflect[k:irows-1,k] to temporarily store the k-th reflection vector
            for(i = 0; i < n; i++) // copy triangular[k:irows-1,k] to reflect[k:irows-1,k]
                reflect[fkk + i] = triangular[rkk + i];
            reflect[fkk] += sign * this._norm2(reflect, fkk, n); // 1st coordinate

            // normalize the k-th reflection vector
            norm = this._norm2(reflect, fkk, n);
            for(i = fkk + n - 1; i >= fkk; i--)
                reflect[i] /= norm;

            // extract reflect[k:irows-1,k], triangular[k:irows-1,k:icolumns-1] and tmprow[0,0:icolumns-k-1]
            submatrices = this._submatrices(subheader, tmprow, [ reflect, triangular ], 1, [ irows, rstride ],
                [ 0, 0, 0, icolumns-k-1 ], // row vector tmprow[0,0:icolumns-k-1]
                [
                    [ k, irows-1, k, k ], // reflect[k:irows-1,k]
                    [ k, irows-1, k, icolumns-1 ] // triangular[k:irows-1,k:icolumns-1]
                ]
            );

            // compute tmprow[0,0:icolumns-k-1] = reflect[k:irows-1,k]^T * triangular[k:irows-1,k:icolumns-1]
            this.multiplylt(submatrices.header, submatrices.output, submatrices.inputs);

            // extract reflect[k:irows-1,k], tmprow[0,0:icolumns-k-1] and tmp[0:irows-k-1,0:icolumns-k-1]
            submatrices = this._submatrices(subheader, tmp, [ reflect, tmprow ], irows, [ irows, 1 ],
                [ 0, irows-k-1, 0, icolumns-k-1 ], // tmp[0:irows-k-1,0:icolumns-k-1]
                [
                    [ k, irows-1, k, k ], // reflect[k:irows-1,k]
                    [ 0, 0, 0, icolumns-k-1] // tmprow[0,0:icolumns-k-1], the result of the previous calculation
                ]
            );

            // compute tmp[0:irows-k-1,0:icolumns-k-1] = reflect[k:irows-1,k] * tmprow[0,0:icolumns-k-1]
            this.outer(submatrices.header, submatrices.output, submatrices.inputs);

            // extract tmp[0:irows-k-1,0:icolumns-k-1] and triangular[k:irows-1,k:icolumns-1] (compute in-place)
            submatrices = this._submatrices(subheader, triangular, [ triangular, tmp ], rstride, [ rstride, irows ],
                [ k, irows-1, k, icolumns-1 ], // triangular[k:irows-1,k:icolumns-1]
                [
                    [ k, irows-1, k, icolumns-1 ], // triangular[k:irows-1,k:icolumns-1]
                    [ 0, irows-k-1, 0, icolumns-k-1 ] // tmp[0:irows-k-1,0:icolumns-k-1], the result of the previous calculation
                ]
            );

            // apply Householder reflector to set the column vector triangular[k+1:irows-1,k] to zero
            this._addInPlace(submatrices.header, submatrices.output, submatrices.inputs, 1, -2);
        }

        // Compute the unitary matrix Q
        switch(mode) {
            case 'full-qr': {
                const qstride = stride;
                const unitary = output.subarray(0, qstride * irows).fill(0);
                let rk, fk, qj, dot;

                // validate output size
                if(orows != irows || ocolumns != icolumns + irows)
                    throw new Error(`Can't compute the full QR decomposition of a ${irows} x ${icolumns} matrix: expected an output matrix of size ${irows} x ${icolumns + irows}, found ${orows} x ${ocolumns}`);

                // apply Householder reflectors to e_j = e_1, ... , e_m
                for(j = 0; j < irows; j++) { // for each e_j
                    qj = j * qstride;
                    unitary[qj + j] = 1; // setup e_j = [ 0 0 0 ... 1 ... 0 0 0 ]^T
                    for(k = icolumns - 1; k >= 0; k--) { // compute Q e_j = ( Q_1 ... Q_n ) e_j
                        fk = k * irows;
                        dot = -2 * this._dot(unitary, reflect, qj + k, fk + k, irows - k);
                        for(i = irows - 1; i >= k; i--)
                            unitary[qj + i] += dot * reflect[fk + i];
                    }
                }

                // fill the lower part of R with zeros
                for(rk = k = 0; k < icolumns; k++, rk += rstride) {
                    for(i = icolumns; i < irows; i++)
                        triangular[rk + i] = 0;
                }

                break;
            }

            case 'reduced-qr': {
                const qstride = stride;
                const unitary = output.subarray(0, qstride * icolumns).fill(0);
                let fk, qj, dot;

                // validate output size
                if(orows != irows || ocolumns != icolumns + icolumns)
                    throw new Error(`Can't compute the reduced QR decomposition of a ${irows} x ${icolumns} matrix: expected an output matrix of size ${irows} x ${icolumns + icolumns}, found ${orows} x ${ocolumns}`);

                // apply Householder reflectors to e_j = e_1, ... , e_n (n <= m)
                for(j = 0; j < icolumns; j++) { // for each e_j
                    qj = j * qstride;
                    unitary[qj + j] = 1; // setup e_j = [ 0 0 0 ... 1 ... 0 0 0 ]^T
                    for(k = icolumns - 1; k >= 0; k--) { // compute Q e_j = ( Q_1 ... Q_n ) e_j
                        fk = k * irows;
                        dot = -2 * this._dot(unitary, reflect, qj + k, fk + k, irows - k);
                        for(i = irows - 1; i >= k; i--)
                            unitary[qj + i] += dot * reflect[fk + i];
                    }
                }

                break;
            }

            default:
                throw new Error(`QR decomposition: unknown mode "${mode}"`);
        }
    }




    // ========================================================
    // Internal low-level utilities
    // ========================================================

    /**
     * Create a new TypedArray with the specified length
     * @param {number} length 
     * @param {number} type 
     * @returns {TypedArray}
     */
    static _createTypedArray(length, type)
    {
        const dataType = this.DataType[type];
        return new dataType(length);
    }

    /**
     * The 2-norm of a column vector
     * @param {TypedArray} column 
     * @param {number} [begin] first index
     * @param {number} [length]
     * @returns {number}
     */
    static _norm2(column, begin = 0, length = column.length)
    {
        let norm = 0, end = begin + length, i;

        // Since we store data in column-major format,
        // we don't need to use stride
        for(i = begin; i < end; i++)
            norm += column[i] * column[i];

        return Math.sqrt(norm);
    }

    /**
     * The dot product of two column vectors
     * @param {TypedArray} u 
     * @param {TypedArray} v 
     * @param {number} [uBegin] first index 
     * @param {number} [vBegin] first index 
     * @param {number} [length] 
     */
    static _dot(u, v, uBegin = 0, vBegin = 0, length = u.length)
    {
        let dot = 0, i;

        for(i = 0; i < length; i++)
            dot += u[uBegin + i] * v[vBegin + i];

        return dot;
    }

    /**
     * Given matrices A and B, scalars alpha and beta,
     * compute the sum (alpha A + beta B). The output
     * array is allowed to be one of the input arrays
     * @param {object} header
     * @param {TypedArray} output
     * @param {TypedArray[]} inputs
     * @param {number} alpha
     * @param {number} beta
     */
    static _addInPlace(header, output, inputs, alpha, beta)
    {
        const { rows, columns, stride } = header;
        const [ strideA, strideB ] = header.strideOfInputs;
        const [ a, b ] = inputs;

        let i, j, oj, aj, bj;
        for(aj = bj = oj = j = 0; j < columns; j++, oj += stride, aj += strideA, bj += strideB) {
            for(i = 0; i < rows; i++)
                output[oj + i] = alpha * a[aj + i] + beta * b[bj + i];
        }
    }

    /**
     * Create submatrices / block-views with shared memory
     * Low-level stuff. Make sure you pass valid indices...
     * @param {object} header will be modified!
     * @param {TypedArray} output contains data
     * @param {TypedArray} inputs contains data
     * @param {number} stride of output
     * @param {number[]} strideOfInputs
     * @param {number[4]} outputIndices [firstRow, lastRow, firstColumn, lastColumn] inclusive
     * @param {Array<number[4]>} inputsIndices for each input matrix
     * @returns {object} { header, output, inputs }
     */
    static _submatrices(header, output, inputs, stride, strideOfInputs, outputIndices, inputsIndices)
    {
        let i, inputIndices;

        header.rows = outputIndices[1] - outputIndices[0] + 1;
        header.columns = outputIndices[3] - outputIndices[2] + 1;
        header.stride = stride;
        output = output.subarray(
            outputIndices[2] * stride + outputIndices[0],
            outputIndices[3] * stride + outputIndices[1] + 1
        );
        header.length = output.length;
        header.byteOffset = output.byteOffset;

        for(i = inputs.length - 1; i >= 0; i--) {
            inputIndices = inputsIndices[i];

            header.rowsOfInputs[i] = inputIndices[1] - inputIndices[0] + 1;
            header.columnsOfInputs[i] = inputIndices[3] - inputIndices[2] + 1;
            header.strideOfInputs[i] = strideOfInputs[i];
            inputs[i] = inputs[i].subarray(
                inputIndices[2] * strideOfInputs[i] + inputIndices[0],
                inputIndices[3] * strideOfInputs[i] + inputIndices[1] + 1
            );
            header.lengthOfInputs[i] = inputs[i].length;
            header.byteOffsetOfInputs[i] = inputs[i].byteOffset;
        }

        return { header, output, inputs };
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
            //[this.MatrixType.F32C1]: Float32Array,
            //[this.MatrixType.F32C2]: Float32Array,
            //[this.MatrixType.F32C3]: Float32Array,
            //[this.MatrixType.F32C4]: Float32Array,
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
            //EYE: 0x1,      // identity matrix
            FILL: 0x2,       // fill the matrix with a constant
            COPY: 0x3,       // copy matrix
            TRANSPOSE: 0x4,  // transpose matrix
            ADD: 0x5,        // add two matrices
            SUBTRACT: 0x6,   // subtract two matrices
            MULTIPLY: 0x7,   // multiply two matrices
            SCALE: 0x8,      // multiply by scalar
            COMPMULT: 0x9,   // component-wise product
            MULTIPLYLT: 0xA, // multiply tranposing the left operand
            MULTIPLYRT: 0xB, // multiply tranposing the right operand
            OUTER: 0xC,      // outer product
            QR: 0x10,        // QR decomposition (Householder)
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
            [this.Opcode.FILL]: this.fill,
            [this.Opcode.COPY]: this.copy,
            [this.Opcode.TRANSPOSE]: this.transpose,
            [this.Opcode.ADD]: this.add,
            [this.Opcode.SUBTRACT]: this.subtract,
            [this.Opcode.MULTIPLY]: this.multiply,
            [this.Opcode.SCALE]: this.scale,
            [this.Opcode.COMPMULT]: this.compmult,
            [this.Opcode.MULTIPLYLT]: this.multiplylt,
            [this.Opcode.MULTIPLYRT]: this.multiplyrt,
            [this.Opcode.OUTER]: this.outer,
            [this.Opcode.QR]: this.qr,
        }));
    }
}

module.exports = { MatrixMath };