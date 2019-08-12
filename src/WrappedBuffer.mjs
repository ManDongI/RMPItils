import { Buffer } from 'buffer';

const IO_TABLES = {
    BigInt64BE: 8,
    BigInt64LE: 8,
    BigUInt64BE: 8,
    BigUInt64LE: 8,
    DoubleBE: 8,
    DoubleLE: 8,
    FloatBE: 4,
    FloatLE: 4,
    Int8: 1,
    Int16BE: 2,
    Int16LE: 2,
    Int32BE: 4,
    Int32LE: 4,
    IntBE: 0,
    IntLE: 0,
    UInt8: 1,
    UInt16BE: 2,
    UInt16LE: 2,
    UInt32BE: 4,
    UInt32LE: 4,
    UIntBE: 0,
    UIntLE: 0,
    LByteArray: 0,
    LString: 0
};

const IO_MARKER = /^(?:read|write)(.*)$/;
const VARYING = /Int(BE|LE)$/;

const WrappedBuffer = new Proxy(class _ extends Buffer {}, {
    construct(target, argsList, newTarget) {
        let buf = argsList[0];
        if (!buf instanceof Buffer)
            throw new TypeError('Not a buffer');
        let extension = {
            offset: 0,
            reset() {
                this.offset = 0;
            },
            checkOffset(len) {
                if (this.offset + len >= this.length)
                    throw new RangeError(`Offset out of range: ${this.offset + len}`);
            },
            read(len, offset = this.offset) {
                this.offset = offset;
                this.checkOffset(len);
                return Uint8Array.prototype.slice.call(buf, this.offset, this.offset += len);
            },
            readLByteArray(offset = this.offset) {
                return this.read(this.readUInt32LE(offset));
            },
            readLString(offset = this.offset) {
                return this.readLByteArray(offset).toString('utf8');
            },
            readLArray(type, offset = this.offset) {
                if (!IO_TABLES.hasOwnProperty(type))
                    throw new ReferenceError('Invalid typed array');
                let len = this.readUInt32LE(offset);
                let readMethod = `read${type}`;
                let tmp = [];
                for (let i = 0; i < len; i++) tmp.push(this[readMethod]());
                return tmp;
            },
            writeAlternative(value, len, offset = this.offset) {
                this.offset = offset;
                this.checkOffset(len);
                value.copy(buf, this.offset, 0, len);
                this.offset += len;
            },
            writeLByteArray(value, offset = this.offset) {
                this.writeUInt32LE(value.length, offset);
                this.writeAlternative(value, value.length);
            },
            writeLString(value, offset = this.offset) {
                this.writeLByteArray(Buffer.from(value, 'utf8'), offset);
            },
            writeLArray(value, type, offset = this.offset) {
                if (!IO_TABLES.hasOwnProperty(type))
                    throw new ReferenceError('Invalid typed array');
                let len = value.length;
                let writeMethod = `write${type}`;
                this.writeUInt32LE(len, offset);
                for (let i = 0; i < len; i++) this[writeMethod](value[i]);
            },
            getOffset() {
                return this.offset;
            },
            setOffset(offset) {
                this.offset = offset;
            },
            getNaked() {
                return buf;
            }
        };
        return new Proxy(buf, {
            get(target, property, receiver) {
                if (typeof property === 'symbol') {
                    let val = target[property];
                    if (val instanceof Function)
                        val = val.bind(target);
                    return val;
                }

                if (extension.hasOwnProperty(property))
                    return Reflect.get(extension, property, receiver);
                if (property === 'write')
                    return function(...args) {
                        if (args.length === 1)
                            args[1] = extension.offset;
                        else
                            extension.offset = args[1];
                        extension.checkOffset(args[0].length);
                        extension.offset += args[0].length;
                        return target.write(...args);
                    };

                if (!IO_MARKER.test(property)) {
                    let val = target[property];
                    if (val instanceof Function)
                        val = val.bind(target);
                    return val;
                }

                if (!IO_TABLES.hasOwnProperty(IO_MARKER.exec(property)[1]))
                    throw new ReferenceError('Invalid method called');
                let offsetPosition = Number(property.startsWith('write'));
                let expectedArgs = offsetPosition + 1;
                const IS_VARYING = VARYING.test(property);
                if (IS_VARYING)
                    expectedArgs += 1;
                return function(...args) {
                    if (args.length < expectedArgs)
                        args.splice(offsetPosition, 0, extension.offset);
                    else
                        extension.offset = args[offsetPosition];
                    let size = IS_VARYING ? args[offsetPosition + 1] : IO_TABLES[IO_MARKER.exec(property)[1]];
                    extension.checkOffset(size);
                    extension.offset += size;
                    return target[property](...args);
                };
            },
            set(target, propertyKey, value, receiver) {
                if (propertyKey === 'offset')
                    extension.offset = value;
                else
                    target[propertyKey] = value;
                return true;
            },
            getPrototypeOf(target) {
                return WrappedBuffer.prototype;
            }
        })
    }
});

export default WrappedBuffer;