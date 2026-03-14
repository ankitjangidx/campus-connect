import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate, formatDateTime, titleCase } from "../lib/utils";

const categories = ["all", "academic", "career", "campus"];

function createCommentBucket() {
  return {
    items: [],
    loading: false,
    loaded: false,
    error: "",
    draft: "",
    replyDrafts: {},
    editDrafts: {},
    replyTargetId: null,
    editTargetId: null,
    submitting: false,
    resolvingId: null,
    deletingId: null
  };
}

function countComments(comments) {
  return comments.reduce(
    (total, comment) => total + 1 + countComments(comment.replies || []),
    0
  );
}

function CommentComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  placeholder,
  submitLabel,
  compact = false
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 ${compact ? "p-3" : "p-4"}`}>
      <textarea
        className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 ${
          compact ? "min-h-24" : "min-h-28"
        }`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <div className="mt-3 flex justify-end gap-2">
        {onCancel ? (
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
        <button
          className="rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#9333ea] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSubmit}
          disabled={submitting || !value.trim()}
          type="button"
        >
          {submitting ? "Posting..." : submitLabel}
        </button>
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  question,
  currentUserId,
  bucket,
  level,
  onReplyToggle,
  onReplyDraftChange,
  onReplySubmit,
  onResolve,
  onEditToggle,
  onEditDraftChange,
  onEditSubmit,
  onDelete
}) {
  const isQuestionOwner = currentUserId === question.author.id;
  const isReplying = bucket.replyTargetId === comment.id;
  const isEditing = bucket.editTargetId === comment.id;
  const replyDraft = bucket.replyDrafts[comment.id] || "";
  const editDraft = bucket.editDrafts[comment.id] ?? comment.body;
  const canResolve =
    isQuestionOwner &&
    !question.resolved &&
    !comment.isDeleted &&
    comment.userId !== question.author.id;
  const canReply = !comment.isDeleted;

  return (
    <div className="space-y-3" style={{ marginLeft: `${Math.min(level, 4) * 20}px` }}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="cc-avatar h-11 w-11 bg-gradient-to-br from-[#ede9fe] to-[#ddd6fe] text-[#6d28d9]">
            {(comment.author.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{comment.author.name}</p>
              <span className="text-xs text-slate-400">{formatDateTime(comment.createdAt)}</span>
              {comment.isQuestionAuthor ? (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  Author
                </span>
              ) : null}
              {comment.isResolved ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Accepted answer
                </span>
              ) : null}
              {comment.isEdited ? (
                <span className="text-xs font-medium text-slate-400">edited</span>
              ) : null}
              {level > 0 ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  Reply
                </span>
              ) : null}
            </div>
            <p
              className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${
                comment.isDeleted ? "italic text-slate-400" : "text-slate-600"
              }`}
            >
              {comment.body}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {canReply ? (
                <button
                  className="text-sm font-medium text-violet-700 hover:text-violet-900"
                  onClick={() => onReplyToggle(comment.id)}
                  type="button"
                >
                  {isReplying ? "Cancel reply" : "Reply"}
                </button>
              ) : null}
              {comment.canEdit ? (
                <button
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                  onClick={() => onEditToggle(comment.id, comment.body)}
                  type="button"
                >
                  {isEditing ? "Cancel edit" : "Edit"}
                </button>
              ) : null}
              {comment.canDelete ? (
                <button
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                  onClick={() => onDelete(comment.id)}
                  type="button"
                  disabled={bucket.deletingId === comment.id}
                >
                  {bucket.deletingId === comment.id ? "Deleting..." : "Delete"}
                </button>
              ) : null}
              {canResolve ? (
                <button
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                  onClick={() => onResolve(comment.id)}
                  type="button"
                  disabled={bucket.resolvingId === comment.id}
                >
                  {bucket.resolvingId === comment.id ? "Resolving..." : "Mark as accepted"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isEditing ? (
        <CommentComposer
          compact
          value={editDraft}
          onChange={(value) => onEditDraftChange(comment.id, value)}
          onSubmit={() => onEditSubmit(comment.id)}
          onCancel={() => onEditToggle(comment.id, null)}
          submitting={bucket.submitting}
          placeholder="Edit your comment..."
          submitLabel="Save Changes"
        />
      ) : null}

      {isReplying ? (
        <CommentComposer
          compact
          value={replyDraft}
          onChange={(value) => onReplyDraftChange(comment.id, value)}
          onSubmit={() => onReplySubmit(comment.id)}
          onCancel={() => onReplyToggle(comment.id)}
          submitting={bucket.submitting}
          placeholder="Write a reply..."
          submitLabel="Post Reply"
        />
      ) : null}

      {comment.replies?.length
        ? comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              question={question}
              currentUserId={currentUserId}
              bucket={bucket}
              level={level + 1}
              onReplyToggle={onReplyToggle}
              onReplyDraftChange={onReplyDraftChange}
              onReplySubmit={onReplySubmit}
              onResolve={onResolve}
              onEditToggle={onEditToggle}
              onEditDraftChange={onEditDraftChange}
              onEditSubmit={onEditSubmit}
              onDelete={onDelete}
            />
          ))
        : null}
    </div>
  );
}

function ForumPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [questions, setQuestions] = useState(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [commentsByQuestion, setCommentsByQuestion] = useState({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "academic"
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const focusedQuestionId = Number.parseInt(searchParams.get("questionId") || "", 10);
  const focusedNotifId = searchParams.get("notif") || "";

  async function fetchQuestions() {
    const response = await api.get("/questions");
    setQuestions(response);
  }

  function updateCommentBucket(questionId, updater) {
    setCommentsByQuestion((current) => {
      const nextBucket = updater(current[questionId] || createCommentBucket());
      return {
        ...current,
        [questionId]: nextBucket
      };
    });
  }

  async function loadComments(questionId, { force = false } = {}) {
    const currentBucket = commentsByQuestion[questionId];

    if (currentBucket?.loaded && !force) {
      return;
    }

    updateCommentBucket(questionId, (bucket) => ({
      ...bucket,
      loading: true,
      error: ""
    }));

    try {
      const response = await api.get(`/questions/${questionId}/comments`);
      updateCommentBucket(questionId, (bucket) => ({
        ...bucket,
        items: response,
        loaded: true,
        loading: false,
        error: ""
      }));
    } catch (requestError) {
      updateCommentBucket(questionId, (bucket) => ({
        ...bucket,
        loading: false,
        error: requestError.message
      }));
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadQuestions() {
      try {
        if (!ignore) {
          await fetchQuestions();
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
  }, []);

  useEffect(() => {
    if (!questions || !Number.isInteger(focusedQuestionId)) {
      return;
    }

    if (!questions.some((question) => question.id === focusedQuestionId)) {
      return;
    }

    setExpandedQuestionId(focusedQuestionId);
    void loadComments(focusedQuestionId, { force: Boolean(focusedNotifId) });

    window.requestAnimationFrame(() => {
      document
        .getElementById(`question-card-${focusedQuestionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [focusedNotifId, focusedQuestionId, questions]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const question = await api.post("/questions", {
        title: form.title,
        description: form.description,
        category: form.category
      });

      setQuestions((current) => [question, ...(current || [])]);
      setForm({ title: "", description: "", category: "academic" });
      setFormOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleDiscussion(questionId) {
    const isClosing = expandedQuestionId === questionId;
    setExpandedQuestionId(isClosing ? null : questionId);

    if (!isClosing) {
      await loadComments(questionId);
    }
  }

  async function submitComment(questionId, parentId = null) {
    const bucket = commentsByQuestion[questionId] || createCommentBucket();
    const body = parentId ? bucket.replyDrafts[parentId] || "" : bucket.draft;

    updateCommentBucket(questionId, (current) => ({
      ...current,
      submitting: true,
      error: ""
    }));

    try {
      await api.post(`/questions/${questionId}/comments`, {
        parentId,
        body
      });

      updateCommentBucket(questionId, (current) => ({
        ...current,
        draft: parentId ? current.draft : "",
        replyDrafts: parentId
          ? {
              ...current.replyDrafts,
              [parentId]: ""
            }
          : current.replyDrafts,
        replyTargetId: parentId ? null : current.replyTargetId
      }));

      await loadComments(questionId, { force: true });
    } catch (requestError) {
      updateCommentBucket(questionId, (current) => ({
        ...current,
        error: requestError.message
      }));
    } finally {
      updateCommentBucket(questionId, (current) => ({
        ...current,
        submitting: false
      }));
    }
  }

  async function handleUpdateComment(questionId, commentId) {
    const bucket = commentsByQuestion[questionId] || createCommentBucket();
    const body = bucket.editDrafts[commentId] || "";

    updateCommentBucket(questionId, (current) => ({
      ...current,
      submitting: true,
      error: ""
    }));

    try {
      await api.put(`/questions/${questionId}/comments/${commentId}`, {
        body
      });
      updateCommentBucket(questionId, (current) => ({
        ...current,
        editTargetId: null
      }));
      await loadComments(questionId, { force: true });
    } catch (requestError) {
      updateCommentBucket(questionId, (current) => ({
        ...current,
        error: requestError.message
      }));
    } finally {
      updateCommentBucket(questionId, (current) => ({
        ...current,
        submitting: false
      }));
    }
  }

  async function handleDeleteComment(questionId, commentId) {
    if (!window.confirm("Delete this comment?")) {
      return;
    }

    updateCommentBucket(questionId, (current) => ({
      ...current,
      deletingId: commentId,
      error: ""
    }));

    try {
      await api.delete(`/questions/${questionId}/comments/${commentId}`);
      await Promise.all([loadComments(questionId, { force: true }), fetchQuestions()]);
    } catch (requestError) {
      updateCommentBucket(questionId, (current) => ({
        ...current,
        error: requestError.message
      }));
    } finally {
      updateCommentBucket(questionId, (current) => ({
        ...current,
        deletingId: null,
        editTargetId: current.editTargetId === commentId ? null : current.editTargetId
      }));
    }
  }

  async function handleResolve(questionId, commentId) {
    updateCommentBucket(questionId, (current) => ({
      ...current,
      resolvingId: commentId,
      error: ""
    }));

    try {
      const updatedQuestion = await api.post(`/questions/${questionId}/resolve`, {
        commentId
      });

      setQuestions((current) =>
        current?.map((question) => (question.id === updatedQuestion.id ? updatedQuestion : question))
      );
      await loadComments(questionId, { force: true });
    } catch (requestError) {
      updateCommentBucket(questionId, (current) => ({
        ...current,
        error: requestError.message
      }));
    } finally {
      updateCommentBucket(questionId, (current) => ({
        ...current,
        resolvingId: null
      }));
    }
  }

  if (error && !questions) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!questions) {
    return <LoadingState label="Loading forum..." />;
  }

  const query = deferredSearch.trim().toLowerCase();
  const filteredQuestions = questions.filter((question) => {
    const matchesSearch =
      !query ||
      question.title.toLowerCase().includes(query) ||
      question.description.toLowerCase().includes(query);
    const matchesCategory =
      activeCategory === "all" || question.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#fdfcff] to-[#f5f0ff]">
      <div className="flex flex-col gap-6 px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Q&amp;A Forum</h1>
            <p className="text-gray-500">
              Ask questions, reply with nested comments, and accept one answer to reward the mentor.
            </p>
          </div>
          <button
            className="rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#9333ea] px-[18px] py-3 font-semibold text-white"
            onClick={() => setFormOpen((value) => !value)}
            type="button"
          >
            {formOpen ? "Close Form" : "+ Ask Question"}
          </button>
        </div>

        {formOpen ? (
          <div className="cc-card p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-[1fr,220px]">
                <input
                  className="rounded-xl border border-gray-200 px-4 py-3"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Enter your question"
                  required
                />
                <select
                  className="rounded-xl border border-gray-200 px-4 py-3"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                >
                  <option value="academic">Academic</option>
                  <option value="career">Career</option>
                  <option value="campus">Campus</option>
                </select>
              </div>
              <textarea
                className="min-h-32 w-full rounded-xl border border-gray-200 px-4 py-3"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Describe your question"
                required
              />
              {error ? (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
              ) : null}
              <button
                className="rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#9333ea] px-[18px] py-3 font-semibold text-white"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Posting..." : "Post Question"}
              </button>
            </form>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            className="flex-1 rounded-[10px] border border-gray-200 bg-white px-3 py-3"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions..."
          />
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`rounded-lg px-4 py-2 ${
                  activeCategory === category
                    ? "border border-gray-200 bg-white"
                    : "bg-[#f1f1f5]"
                }`}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {titleCase(category)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-10 md:px-10">
        {filteredQuestions.length ? (
          <div className="space-y-5">
            {filteredQuestions.map((question) => {
              const bucket = commentsByQuestion[question.id] || createCommentBucket();
              const isExpanded = expandedQuestionId === question.id;
              const discussionCount = bucket.loaded ? countComments(bucket.items) : null;

              return (
                <article
                  key={question.id}
                  id={`question-card-${question.id}`}
                  className={`overflow-hidden rounded-3xl bg-white shadow-card ${
                    focusedQuestionId === question.id ? "ring-2 ring-blue-200" : ""
                  }`}
                >
                  <div className="border-b border-slate-100 p-6">
                    <div className="flex items-start gap-4">
                      <div className="cc-avatar h-[52px] w-[52px] bg-gradient-to-br from-[#ddd6fe] to-[#ede9fe] text-[#6d28d9]">
                        {(question.author.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-slate-900">{question.title}</h3>
                          <span
                            className={`cc-chip ${
                              question.category === "campus"
                                ? "bg-green-100 text-green-700"
                                : "bg-[#ede9fe] text-[#6d28d9]"
                            }`}
                          >
                            {question.category}
                          </span>
                          {question.resolved ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Resolved
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              Open
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-gray-400">
                          {question.author.name} • {formatDateTime(question.createdAt)}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-600">
                          {question.description}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            onClick={() => handleToggleDiscussion(question.id)}
                            type="button"
                          >
                            {isExpanded ? "Hide discussion" : "View discussion"}
                          </button>
                          <span className="text-sm text-slate-500">
                            {bucket.loading
                              ? "Loading discussion..."
                              : discussionCount === null
                                ? "Replies load when you open the discussion"
                                : `${discussionCount} ${discussionCount === 1 ? "comment" : "comments"}`}
                          </span>
                          {question.resolvedBy ? (
                            <span className="text-sm font-medium text-emerald-700">
                              Accepted answer selected
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="space-y-5 bg-[#fcfbff] p-6">
                      <CommentComposer
                        value={bucket.draft}
                        onChange={(value) =>
                          updateCommentBucket(question.id, (current) => ({
                            ...current,
                            draft: value
                          }))
                        }
                        onSubmit={() => submitComment(question.id)}
                        submitting={bucket.submitting}
                        placeholder="Write an answer or start the discussion..."
                        submitLabel="Post Comment"
                      />

                      {bucket.error ? (
                        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                          {bucket.error}
                        </div>
                      ) : null}

                      {bucket.loading ? (
                        <LoadingState label="Loading comments..." />
                      ) : bucket.items.length ? (
                        <div className="space-y-4">
                          {bucket.items.map((comment) => (
                            <CommentThread
                              key={comment.id}
                              comment={comment}
                              question={question}
                              currentUserId={user.id}
                              bucket={bucket}
                              level={0}
                              onReplyToggle={(commentId) =>
                                updateCommentBucket(question.id, (current) => ({
                                  ...current,
                                  replyTargetId:
                                    current.replyTargetId === commentId ? null : commentId
                                }))
                              }
                              onReplyDraftChange={(commentId, value) =>
                                updateCommentBucket(question.id, (current) => ({
                                  ...current,
                                  replyDrafts: {
                                    ...current.replyDrafts,
                                    [commentId]: value
                                  }
                                }))
                              }
                              onReplySubmit={(commentId) => submitComment(question.id, commentId)}
                              onResolve={(commentId) => handleResolve(question.id, commentId)}
                              onEditToggle={(commentId, value) =>
                                updateCommentBucket(question.id, (current) => ({
                                  ...current,
                                  editTargetId:
                                    current.editTargetId === commentId ? null : commentId,
                                  editDrafts:
                                    value === null
                                      ? current.editDrafts
                                      : {
                                          ...current.editDrafts,
                                          [commentId]: value
                                        }
                                }))
                              }
                              onEditDraftChange={(commentId, value) =>
                                updateCommentBucket(question.id, (current) => ({
                                  ...current,
                                  editDrafts: {
                                    ...current.editDrafts,
                                    [commentId]: value
                                  }
                                }))
                              }
                              onEditSubmit={(commentId) =>
                                handleUpdateComment(question.id, commentId)
                              }
                              onDelete={(commentId) =>
                                handleDeleteComment(question.id, commentId)
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="No comments yet"
                          description="Be the first to answer this question or start a thread."
                        />
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No questions found"
            description="Try a different search term or a different category."
          />
        )}
      </div>
    </div>
  );
}

export default ForumPage;
