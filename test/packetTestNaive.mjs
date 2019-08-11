import StructuredPacket from '../src/StructuredPacket.mjs';
import WrappedBuffer from '../src/WrappedBuffer.mjs';

class StringArrayPacket extends StructuredPacket {
    static id = 100;
    strArr = [];

    decode() {
        super.decode();
        this.strArr = this.wbuf.readLArray('LString');
    }

    encode() {
        super.encode();
        this.wbuf.writeLArray(this.strArr, 'LString');
    }

    getEstimatedSize() {
        return this.strArr.map(e => Buffer.from(e, 'utf8').length)
            .reduce((a, b) => a + b) + 8 * this.strArr.length;
    }
}

let original = ['Hello', 'World!'];
let helloWorld = new WrappedBuffer(Buffer.alloc(35));
helloWorld.writeLArray(original, 'LString');
let testPacket = new StringArrayPacket(helloWorld);
testPacket.decode();
console.assert(testPacket.strArr.every((e, i) => original[i] === e));
original = ['Hello12332142345235', 'World3847238457923874892374'];
testPacket.strArr = original;
testPacket.encode();
testPacket.decode();
console.assert(testPacket.strArr.every((e, i) => original[i] === e));
console.log(testPacket.getRawData());