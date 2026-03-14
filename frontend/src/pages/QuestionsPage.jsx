import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate, titleCase } from "../lib/utils";

function QuestionsPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadQuestions() {
      try {
        const response = await api.get(`/users/${user.id}/questions`);
        if (!ignore) {
          setQuestions(response);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      }
    }

    loadQuestions();

    return () => {
      ignore = true;
    };
  }, [user.id]);

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!questions) {
    return <LoadingState label="Loading your questions..." />;
  }

  return (
    <div className="space-y-8">
      <section className="cc-card flex flex-col gap-4 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Questions Asked</h1>
          <p className="text-gray-500">
            Track your forum posts and jump back into discussion when needed.
          </p>
        </div>
        <Link to="/forum" className="cc-button-primary text-center">
          Open Forum
        </Link>
      </section>

      {questions.length ? (
        <section className="space-y-5">
          {questions.map((question) => (
            <article key={question.id} className="cc-card p-6">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="cc-chip bg-brand-50 text-brand-600">
                  {titleCase(question.category)}
                </span>
                <span
                  className={`cc-chip ${
                    question.resolved
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {question.resolved ? "Resolved" : "Open"}
                </span>
                <span className="text-sm text-gray-400">{formatDate(question.createdAt)}</span>
              </div>
              <h2 className="mb-2 text-xl font-semibold">{question.title}</h2>
              <p className="text-gray-600">{question.description}</p>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="You have not asked anything yet"
          description="Use the forum to ask questions about academics, careers, or campus life."
        />
      )}
    </div>
  );
}

export default QuestionsPage;
