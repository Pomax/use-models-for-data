export default function labelFunction(field_name) {
  return (
    field_name[0].toUpperCase() +
    field_name.substring(1).replace(/_(\w)/g, (_, b) => ` ${b.toUpperCase()}`)
  );
}
