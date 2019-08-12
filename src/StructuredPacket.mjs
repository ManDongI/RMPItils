import WrappedBuffer from './WrappedBuffer.mjs';

export default class StructuredPacket {
    static id = 0; // reserved

    #buf;

    constructor(buf) {
        if (buf.length < 1)
            throw new RangeError('Cannot write id');
        this.#buf = buf;
        this.wbuf = new WrappedBuffer(buf.subarray(1));
    }

    decode() {
        this.wbuf.reset();
        //
    }

    encode() {
        this.#buf[0] = this.constructor.id;
        this.wbuf.reset();
        this.grow();
    }

    getRealSize() {
        return this.wbuf.length;
    }

    getEstimatedSize() {
        return 0;
    }

    grow(size = this.getEstimatedSize()) {
        if (size <= this.getRealSize())
            return;
        let newBuf = Buffer.alloc(size + 1);
        this.#buf.copy(newBuf, 0);
        this.#buf = newBuf;
        this.wbuf = new WrappedBuffer(newBuf.subarray(1));
    }

    getRawData() {
        return this.#buf;
    }
}