export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-ph-deep">
      {children}
    </div>
  );
}
