import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const courseOptions = ["B.Tech", "M.Tech", "BCA", "MCA", "MSc"];
const branchOptions = ["CS", "CS-AI", "IT", "DS"];

function RegisterPage() {
  const { user, ready, register, pending } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    userId: "",
    email: "",
    password: "",
    confirmPassword: "",
    admissionYear: "",
    course: "",
    branch: ""
  });
  const [error, setError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState("");

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

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!otpSent || !otpCode.trim()) {
      setError("Send the OTP to your email and enter it before registering");
      return;
    }

    try {
      await register({
        username: form.username,
        userId: form.userId,
        email: form.email,
        password: form.password,
        otpCode,
        admissionYear: form.admissionYear,
        course: form.course,
        branch: form.branch
      });
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleSendOtp() {
    setError("");

    if (!form.email.trim()) {
      setError("Enter your email first");
      return;
    }

    setOtpSending(true);
    setOtpInfo("");

    try {
      const response = await api.post("/auth/request-otp", {
        email: form.email
      });
      setOtpSent(true);
      setOtpInfo(`OTP sent to ${response.email}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setOtpSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#5f4dee] to-[#8b6cf6] px-4 py-8">
      <section className="w-full max-w-[520px] rounded-[18px] bg-white px-10 py-[35px] text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-[55px] w-[55px] items-center justify-center rounded-xl bg-gradient-to-br from-[#5f4dee] to-[#8b6cf6] text-[26px] text-white">
          👥
        </div>
        <h2 className="mb-1 text-2xl font-bold text-[#222]">Campus Connect</h2>
        <p className="mb-6 text-sm text-gray-500">Connect with seniors & peers</p>

        <form className="space-y-4 text-left" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-gray-600">Username</span>
              <input
                className="cc-input"
                value={form.username}
                onChange={(event) => updateField("username", event.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] text-gray-600">User ID</span>
              <input
                className="cc-input"
                value={form.userId}
                onChange={(event) => updateField("userId", event.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-gray-600">Email ID</span>
              <input
                className="cc-input"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] text-gray-600">Admission Year</span>
              <input
                className="cc-input"
                type="number"
                value={form.admissionYear}
                onChange={(event) => updateField("admissionYear", event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr,180px]">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-gray-600">OTP</span>
              <input
                className="cc-input"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="Enter 6-digit OTP"
              />
            </label>

            <div className="flex items-end">
              <button
                className="w-full rounded-[10px] border border-[#6a5cf5] px-4 py-[13px] text-sm font-semibold text-[#6a5cf5]"
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending}
              >
                {otpSending ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            </div>
          </div>

          {otpInfo ? (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {otpInfo}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-gray-600">Password</span>
              <input
                className="cc-input"
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] text-gray-600">Confirm Password</span>
              <input
                className="cc-input"
                type="password"
                value={form.confirmPassword}
                onChange={(event) =>
                  updateField("confirmPassword", event.target.value)
                }
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-gray-600">Course</span>
              <select
                className="cc-select"
                value={form.course}
                onChange={(event) => updateField("course", event.target.value)}
              >
                <option value="">Select course</option>
                {courseOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] text-gray-600">Branch</span>
              <select
                className="cc-select"
                value={form.branch}
                onChange={(event) => updateField("branch", event.target.value)}
              >
                <option value="">Select branch</option>
                {branchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            className="mt-2 w-full rounded-[10px] bg-gradient-to-br from-[#5f4dee] to-[#8b6cf6] px-4 py-[13px] text-base font-semibold text-white"
            type="submit"
            disabled={pending}
          >
            {pending ? "Creating account..." : "Register"}
          </button>
        </form>

        <div className="mt-5 text-sm text-gray-500">
          <p>
            Already have an account?{" "}
            <Link className="font-semibold text-[#6a5cf5]" to="/login">
              Login
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default RegisterPage;
