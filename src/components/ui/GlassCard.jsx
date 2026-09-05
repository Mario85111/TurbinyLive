// Reużywalny kontener z efektem glasmorfizmu — bez domyślnego paddingu.
export default function GlassCard({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`glass ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
