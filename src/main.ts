import { FileSpec, InterfaceSpec, PropertySpec, TypeName, TypeNames } from "ts-poet";
import { google } from "../build/pbjs";
import CodeGeneratorRequest = google.protobuf.compiler.CodeGeneratorRequest;
import IFileDescriptorProto = google.protobuf.IFileDescriptorProto;
import DescriptorProto = google.protobuf.DescriptorProto;
import FieldDescriptorProto = google.protobuf.FieldDescriptorProto;

function readStdin(): Promise<Buffer> {
  return new Promise(resolve => {
    const ret: Array<Buffer | string> = [];
    let len = 0;
    const stdin = process.stdin;
    stdin.on('readable', () => {
      let chunk;
      while ((chunk = stdin.read())) {
        ret.push(chunk);
        len += chunk.length;
      }
    });
    stdin.on('end', () => {
      resolve(Buffer.concat(ret as any, len));
    });
  });
}

async function main() {
  const stdin = await readStdin();
  // const json = JSON.parse(stdin.toString());
  // const request = CodeGeneratorRequest.fromObject(json);
  const request = CodeGeneratorRequest.decode(stdin);
  console.log(request.fileToGenerate);
  for (let file of request.protoFile) {
    generateFile(file);
  }
  console.log(request.protoFile.length);
}

export function generateFile(fileDesc: IFileDescriptorProto): FileSpec {
  let file = FileSpec.create(fileDesc.name!);
  if (fileDesc.messageType) {
    for (const messageDesc of fileDesc.messageType) {
      file = generateMessage(file, messageDesc);
    }
  }
  return file;
}

function generateMessage(file: FileSpec, messageDesc: DescriptorProto): FileSpec {
  console.log(messageDesc.name);
  let message = InterfaceSpec.create(messageDesc.name!);
  for (const fieldDesc of messageDesc.field) {
    const type = toJsType(fieldDesc);
    message = message.addProperty(PropertySpec.create(fieldDesc.name!, TypeNames.anyType(type)));
  }
  if (messageDesc.nestedType) {
    for (const nestedDesc of messageDesc.nestedType) {
      file = generateMessage(file, nestedDesc);
    }
  }
  return file.addInterface(message);
}

function toJsType(field: FieldDescriptorProto): string {
  const type = toJsType2(field);
  if (field.label === FieldDescriptorProto.Label.LABEL_REPEATED) {
    return `Array<${type.toString()}>`;
  }
  return type.toString();
}

function toJsType2(field: FieldDescriptorProto): TypeName {
  switch (field.type) {
    case FieldDescriptorProto.Type.TYPE_DOUBLE:
    case FieldDescriptorProto.Type.TYPE_FLOAT:
    case FieldDescriptorProto.Type.TYPE_INT32:
    case FieldDescriptorProto.Type.TYPE_UINT32:
    case FieldDescriptorProto.Type.TYPE_SINT32:
    case FieldDescriptorProto.Type.TYPE_FIXED32:
    case FieldDescriptorProto.Type.TYPE_SFIXED32:
      return TypeNames.NUMBER;
    case FieldDescriptorProto.Type.TYPE_INT64:
    case FieldDescriptorProto.Type.TYPE_UINT64:
    case FieldDescriptorProto.Type.TYPE_SINT64:
    case FieldDescriptorProto.Type.TYPE_FIXED64:
    case FieldDescriptorProto.Type.TYPE_SFIXED64:
      // type = config.forceLong ? "Long" : config.forceNumber ? "number" : "number|Long";
      return TypeNames.NUMBER;
    case FieldDescriptorProto.Type.TYPE_BOOL:
      return TypeNames.BOOLEAN;
    case FieldDescriptorProto.Type.TYPE_STRING:
      return TypeNames.STRING;
    case FieldDescriptorProto.Type.TYPE_BYTES:
      return TypeNames.anyType("Uint8Array");
    case FieldDescriptorProto.Type.TYPE_MESSAGE:
      return TypeNames.anyType(field.typeName);
    default:
      return TypeNames.anyType(field.typeName);
    // if (field.resolve().resolvedType)
    //   type = exportName(field.resolvedType, !(field.resolvedType instanceof protobuf.Enum || config.forceMessage));
    // else
    //   type = "*"; // should not happen
    // break;
  }
}

main().then(() => {
  console.log('done');
});

