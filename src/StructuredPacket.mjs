import WrappedBuffer from './WrappedBuffer.mjs';

export default class StructuredPacket {
    constructor(wbuf) {
        this.wbuf = wbuf;
    }

    decode() {
        this.wbuf.reset();
        //
    }

    encode() {
        this.wbuf.reset();
        this.grow();
    }

    getRealSize() {
        return this.wbuf.length;
    }

    getEstimatedSize() {
        return 0;
    }

    grow() {
        if (this.getEstimatedSize() <= this.getRealSize())
            return;
        let newBuf = Buffer.alloc(this.getEstimatedSize());
        this.wbuf.copy(newBuf, 0);
        this.wbuf = new WrappedBuffer(newBuf);
    }

    getRawData() {
        return this.wbuf.getNaked();
    }
}