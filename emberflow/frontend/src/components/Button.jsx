export default function Button({ as: Component = 'button', className = '', variant = 'ghost', size = '', ...props }) {
  const classes = ['button', variant, size, className].filter(Boolean).join(' ');
  return <Component className={classes} {...props} />;
}
