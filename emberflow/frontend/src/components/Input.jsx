export default function Input({ label, className = '', textarea = false, ...props }) {
  const Control = textarea ? 'textarea' : 'input';
  return (
    <label className={className}>
      {label}
      <Control {...props} />
    </label>
  );
}
