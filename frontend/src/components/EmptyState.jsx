function EmptyState({ title, description }) {
  return (
    <div className="cc-card flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="max-w-xl text-sm text-gray-500">{description}</p>
    </div>
  );
}

export default EmptyState;
