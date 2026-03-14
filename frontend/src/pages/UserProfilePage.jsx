import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import LoadingState from "../components/LoadingState";
import { api } from "../lib/api";
import { getDisplayName } from "../lib/utils";

function UserProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const response = await api.get(`/users/${id}`);
        if (!ignore) {
          setProfile(response);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [id]);

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!profile) {
    return <LoadingState label="Loading profile..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-white p-4 shadow">
        <h1 className="text-xl font-bold">Profile</h1>
        <Link to="/connect" className="text-blue-600 hover:underline">
          Back to Connect
        </Link>
      </header>

      <main className="mx-auto mt-6 max-w-3xl">
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-4">
            <div className="cc-avatar h-16 w-16 bg-blue-100 text-2xl text-blue-700">
              {getDisplayName(profile)[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold">{getDisplayName(profile)}</h2>
              <p className="text-sm text-gray-500">{profile.branch}</p>
            </div>
          </div>

          <p className="mb-2 text-gray-500">
            <strong>Program:</strong> {profile.course}
          </p>
          <p className="mb-2 text-gray-500">
            <strong>Year:</strong> {profile.admissionYear || "Student"}
          </p>
          <p className="mb-2 text-gray-500">
            <strong>Exam Prep:</strong> {profile.examType || "General"}
          </p>
          <p className="mb-2 text-gray-500">
            <strong>Bio:</strong> {profile.bio || "No bio added yet."}
          </p>

          <Link
            to="/connect"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Connect
          </Link>
        </div>
      </main>
    </div>
  );
}

export default UserProfilePage;
