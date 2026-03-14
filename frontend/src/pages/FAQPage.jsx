import { useState } from "react";

const faqItems = [
  {
    category: "general",
    question: "How do I create an account on Campus Connect?",
    answer:
      "Open the sign up page, fill in your details, and your profile will be created in the MySQL-backed app."
  },
  {
    category: "general",
    question: "How can I find a mentor?",
    answer:
      "Use the Connect page to filter people by branch, course, or exam preparation and then open a direct chat."
  },
  {
    category: "admissions",
    question: "What is the admission process?",
    answer:
      "The exact process depends on your institution, but Campus Connect can help you learn from seniors who already went through it."
  },
  {
    category: "career",
    question: "How do I apply for internships?",
    answer:
      "The profile and forum sections help you learn from peers who have already completed internships and documented their work."
  }
];

const categories = ["all", "admissions", "academics", "campus", "career", "financial"];

function FAQPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openQuestion, setOpenQuestion] = useState(faqItems[0].question);

  const filteredItems = faqItems.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query);
    const matchesCategory =
      activeCategory === "all" || item.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="px-5 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-[28px] font-bold text-gray-900">
            How can we help you?
          </h1>
          <p className="text-base text-gray-500">
            Find answers to common questions about Campus Connect
          </p>
        </div>

        <div className="mb-5 flex justify-center">
          <input
            className="max-w-[500px] rounded-xl border border-gray-300 px-4 py-3 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search FAQs..."
          />
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2.5">
          {categories.map((category) => (
            <button
              key={category}
              className={`rounded-full px-5 py-2 text-sm ${
                activeCategory === category
                  ? "bg-[#7c3aed] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setActiveCategory(category)}
            >
              {category[0].toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div>
          {filteredItems.map((item) => {
            const isOpen = openQuestion === item.question;

            return (
              <div
                key={item.question}
                className="mb-2.5 cursor-pointer rounded-xl bg-white px-5 py-4 shadow"
                onClick={() => setOpenQuestion(isOpen ? "" : item.question)}
              >
                <div className="flex items-center justify-between gap-4 font-medium text-gray-900">
                  <span>
                    <span className="mr-2.5 rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {item.category}
                    </span>
                    {item.question}
                  </span>
                  <span className={`text-lg transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
                </div>
                {isOpen ? (
                  <div className="mt-2.5 text-sm text-gray-500">{item.answer}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FAQPage;
