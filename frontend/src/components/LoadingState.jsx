function LoadingState({ label = "Loading..." }) {
  return (
    <div className="cc-card flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="h-5 w-5 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-purple-600" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default LoadingState;
