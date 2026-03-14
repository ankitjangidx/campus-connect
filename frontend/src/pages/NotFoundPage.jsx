import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#5f4dee] to-[#8b6cf6] px-4">
      <section className="w-full max-w-md rounded-[18px] bg-white px-8 py-10 text-center shadow-soft">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#6a5cf5]">
          404
        </p>
        <h1 className="mb-3 text-3xl font-bold text-[#222]">Page not found</h1>
        <p className="mb-6 text-sm text-gray-500">
          The route does not exist in the React version of Campus Connect.
        </p>
        <Link
          className="inline-block rounded-[10px] bg-gradient-to-br from-[#5f4dee] to-[#8b6cf6] px-6 py-3 font-semibold text-white"
          to="/"
        >
          Return Home
        </Link>
      </section>
    </div>
  );
}

export default NotFoundPage;
