import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { user, ready, login, pending } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    identifier: "",
    password: ""
  });
  const [error, setError] = useState("");

  if (!ready) {
    return <LoadingState label="Checking session..." />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await login(form);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#5f4dee] to-[#8b6cf6] px-4">
      <section className="w-full max-w-[380px] rounded-[18px] bg-white px-[30px] py-[35px] text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-[55px] w-[55px] items-center justify-center rounded-[14px] bg-gradient-to-br from-[#5f4dee] to-[#8b6cf6] text-[26px] text-white">
          👥
        </div>
        <h2 className="mb-1 text-2xl font-bold text-[#222]">Campus Connect</h2>
        <p className="mb-6 text-sm text-gray-500">Connect with seniors & peers</p>

        <form className="space-y-4 text-left" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-[13px] text-gray-600">User ID or Email</span>
            <input
              className="cc-input"
              value={form.identifier}
              onChange={(event) => updateField("identifier", event.target.value)}
              placeholder="student01"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] text-gray-600">Password</span>
            <input
              className="cc-input"
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button className="w-full rounded-[10px] bg-gradient-to-br from-[#5f4dee] to-[#8b6cf6] px-4 py-[13px] text-base font-semibold text-white" type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-5 text-sm text-gray-500">
          <p>
            Don’t have an account?{" "}
            <Link className="font-semibold text-[#6a5cf5]" to="/register">
              Get Started
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
