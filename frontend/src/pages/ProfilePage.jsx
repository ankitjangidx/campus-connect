import { useEffect, useState } from "react";

import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const courseOptions = ["B.Tech", "M.Tech", "BCA", "MCA", "MSc"];
const branchOptions = ["CS", "CS-AI", "IT", "DS"];
const examOptions = ["GATE", "CAT", "Civil Services", "Army", "Other"];
const genderOptions = ["Female", "Male", "Other"];

function emptyProfile() {
  return {
    username: "",
    userIdentifier: "",
    personal: {
      firstName: "",
      lastName: "",
      bio: "",
      dob: "",
      gender: "",
      phoneNumber: "",
      alternatePhone: "",
      email: ""
    },
    academic: {
      course: "",
      branch: "",
      admissionYear: "",
      examPrep: "no",
      examType: "",
      otherExam: "",
      internships: [],
      projects: []
    },
    career: {
      workExperiences: []
    },
    skills: []
  };
}

const emptyInternship = () => ({
  company: "",
  role: "",
  duration: "",
  location: "",
  responsibilities: ""
});

const emptyProject = () => ({
  name: "",
  github: "",
  description: "",
  tech: ""
});

const emptyWorkExperience = () => ({
  company: "",
  role: "",
  duration: "",
  address: ""
});

const emptySkill = () => ({
  skillName: "",
  proficiencyLevel: "",
  certification: "",
  issuedBy: ""
});

function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function LabeledInput({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function ProfilePage() {
  const { user, syncUser } = useAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const response = await api.get(`/users/${user.id}/profile`);
        if (!ignore) {
          setProfile({ ...emptyProfile(), ...response });
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [user.id]);

  function updateSection(section, key, value) {
    setProfile((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value
      }
    }));
  }

  function updateNestedList(section, listKey, index, key, value) {
    setProfile((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [listKey]: current[section][listKey].map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item
        )
      }
    }));
  }

  function addNestedListItem(section, listKey, factory) {
    setProfile((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [listKey]: [...current[section][listKey], factory()]
      }
    }));
  }

  function removeNestedListItem(section, listKey, index) {
    setProfile((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [listKey]: current[section][listKey].filter((_, itemIndex) => itemIndex !== index)
      }
    }));
  }

  function updateSkill(index, key, value) {
    setProfile((current) => ({
      ...current,
      skills: current.skills.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    }));
  }

  function addSkill() {
    setProfile((current) => ({
      ...current,
      skills: [...current.skills, emptySkill()]
    }));
  }

  function removeSkill(index) {
    setProfile((current) => ({
      ...current,
      skills: current.skills.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(`/users/${user.id}/profile`, profile);
      setProfile({ ...emptyProfile(), ...response });
      syncUser({
        displayName:
          `${response.personal.firstName} ${response.personal.lastName}`.trim() ||
          user.username,
        email: response.personal.email,
        course: response.academic.course,
        branch: response.academic.branch,
        admissionYear: response.academic.admissionYear,
        examPrep: response.academic.examPrep
      });
      setSuccess("Profile saved successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading profile..." />;
  }

  const tabs = ["personal", "academic", "career", "skills"];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-1 text-gray-600">
            Manage your personal and academic information
          </p>
        </div>
        <button
          className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>

      <div className="cc-card">
        <div className="flex items-center gap-6 p-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-3xl text-white">
            👤
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {profile.personal.firstName || profile.username || "Student"}{" "}
              {profile.personal.lastName}
            </h2>
            <p className="text-gray-600">
              {profile.academic.course} {profile.academic.branch}
            </p>
            <p className="text-gray-600">
              Year of Admission: {profile.academic.admissionYear || "Not added"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {profile.personal.email || "No email added"}
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {success ? (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">{success}</div>
      ) : null}

      <div className="cc-card p-6">
        <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-lg border text-center md:grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`py-2 ${
                activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "personal" ? (
          <div className="space-y-5">
            <SectionTitle title="Personal Information" />
            <div className="grid gap-5 md:grid-cols-2">
              <LabeledInput label="First Name">
                <input
                  className="cc-input"
                  value={profile.personal.firstName}
                  onChange={(event) => updateSection("personal", "firstName", event.target.value)}
                />
              </LabeledInput>
              <LabeledInput label="Last Name">
                <input
                  className="cc-input"
                  value={profile.personal.lastName}
                  onChange={(event) => updateSection("personal", "lastName", event.target.value)}
                />
              </LabeledInput>
              <LabeledInput label="Email ID">
                <input
                  className="cc-input"
                  type="email"
                  value={profile.personal.email}
                  onChange={(event) => updateSection("personal", "email", event.target.value)}
                />
              </LabeledInput>
              <LabeledInput label="Date of Birth">
                <input
                  className="cc-input"
                  type="date"
                  value={profile.personal.dob}
                  onChange={(event) => updateSection("personal", "dob", event.target.value)}
                />
              </LabeledInput>
              <LabeledInput label="Gender">
                <select
                  className="cc-select"
                  value={profile.personal.gender}
                  onChange={(event) => updateSection("personal", "gender", event.target.value)}
                >
                  <option value="">Select gender</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </LabeledInput>
              <LabeledInput label="Contact No">
                <input
                  className="cc-input"
                  value={profile.personal.phoneNumber}
                  onChange={(event) =>
                    updateSection("personal", "phoneNumber", event.target.value)
                  }
                />
              </LabeledInput>
            </div>

            <LabeledInput label="Alternate Contact No">
              <input
                className="cc-input"
                value={profile.personal.alternatePhone}
                onChange={(event) =>
                  updateSection("personal", "alternatePhone", event.target.value)
                }
              />
            </LabeledInput>

            <LabeledInput label="Bio">
              <textarea
                className="cc-input min-h-[120px]"
                value={profile.personal.bio}
                onChange={(event) => updateSection("personal", "bio", event.target.value)}
              />
            </LabeledInput>
          </div>
        ) : null}

        {activeTab === "academic" ? (
          <div className="space-y-8">
            <SectionTitle title="Academic Information" subtitle="Basic details" />
            <div className="grid gap-5 md:grid-cols-2">
              <LabeledInput label="Course">
                <select
                  className="cc-select"
                  value={profile.academic.course}
                  onChange={(event) => updateSection("academic", "course", event.target.value)}
                >
                  <option value="">Select course</option>
                  {courseOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </LabeledInput>
              <LabeledInput label="Branch / Department">
                <select
                  className="cc-select"
                  value={profile.academic.branch}
                  onChange={(event) => updateSection("academic", "branch", event.target.value)}
                >
                  <option value="">Select branch</option>
                  {branchOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </LabeledInput>
              <LabeledInput label="Year of Admission">
                <input
                  className="cc-input"
                  type="number"
                  value={profile.academic.admissionYear}
                  onChange={(event) =>
                    updateSection("academic", "admissionYear", event.target.value)
                  }
                />
              </LabeledInput>
              <LabeledInput label="Are you preparing for any exam?">
                <select
                  className="cc-select"
                  value={profile.academic.examPrep}
                  onChange={(event) => updateSection("academic", "examPrep", event.target.value)}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </LabeledInput>
              <LabeledInput label="Select Exam">
                <select
                  className="cc-select"
                  value={profile.academic.examType}
                  onChange={(event) => updateSection("academic", "examType", event.target.value)}
                >
                  <option value="">Select exam</option>
                  {examOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </LabeledInput>
              {profile.academic.examType === "Other" ? (
                <LabeledInput label="Specify Exam">
                  <input
                    className="cc-input"
                    value={profile.academic.otherExam}
                    onChange={(event) =>
                      updateSection("academic", "otherExam", event.target.value)
                    }
                  />
                </LabeledInput>
              ) : null}
            </div>

            <div className="space-y-4">
              <SectionTitle
                title="Internships"
                action={
                  <button
                    className="text-sm font-semibold text-indigo-600"
                    onClick={() => addNestedListItem("academic", "internships", emptyInternship)}
                  >
                    + Add Internship
                  </button>
                }
              />
              {profile.academic.internships.map((internship, index) => (
                <div key={`internship-${index}`} className="rounded-xl border bg-gray-50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-semibold">Internship {index + 1}</h4>
                    <button
                      className="text-red-600"
                      onClick={() => removeNestedListItem("academic", "internships", index)}
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      ["Company Name", "company"],
                      ["Role", "role"],
                      ["Duration", "duration"],
                      ["Location", "location"]
                    ].map(([label, key]) => (
                      <LabeledInput key={key} label={label}>
                        <input
                          className="cc-input"
                          value={internship[key]}
                          onChange={(event) =>
                            updateNestedList(
                              "academic",
                              "internships",
                              index,
                              key,
                              event.target.value
                            )
                          }
                        />
                      </LabeledInput>
                    ))}
                  </div>
                  <LabeledInput label="Responsibilities">
                    <textarea
                      className="cc-input mt-4 min-h-[96px]"
                      value={internship.responsibilities}
                      onChange={(event) =>
                        updateNestedList(
                          "academic",
                          "internships",
                          index,
                          "responsibilities",
                          event.target.value
                        )
                      }
                    />
                  </LabeledInput>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <SectionTitle
                title="Projects"
                action={
                  <button
                    className="text-sm font-semibold text-indigo-600"
                    onClick={() => addNestedListItem("academic", "projects", emptyProject)}
                  >
                    + Add Project
                  </button>
                }
              />
              {profile.academic.projects.map((project, index) => (
                <div key={`project-${index}`} className="rounded-xl border bg-gray-50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-semibold">Project {index + 1}</h4>
                    <button
                      className="text-red-600"
                      onClick={() => removeNestedListItem("academic", "projects", index)}
                    >
                      🗑️
                    </button>
                  </div>
                  {[
                    ["Project Name", "name"],
                    ["GitHub Repository", "github"],
                    ["Technology Used", "tech"]
                  ].map(([label, key]) => (
                    <LabeledInput key={key} label={label}>
                      <input
                        className="cc-input"
                        value={project[key]}
                        onChange={(event) =>
                          updateNestedList(
                            "academic",
                            "projects",
                            index,
                            key,
                            event.target.value
                          )
                        }
                      />
                    </LabeledInput>
                  ))}
                  <LabeledInput label="Description">
                    <textarea
                      className="cc-input min-h-[96px]"
                      value={project.description}
                      onChange={(event) =>
                        updateNestedList(
                          "academic",
                          "projects",
                          index,
                          "description",
                          event.target.value
                        )
                      }
                    />
                  </LabeledInput>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "career" ? (
          <div className="space-y-4">
            <SectionTitle
              title="Career Information"
              action={
                <button
                  className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600"
                  onClick={() =>
                    addNestedListItem("career", "workExperiences", emptyWorkExperience)
                  }
                >
                  + Add Work
                </button>
              }
            />
            {profile.career.workExperiences.map((experience, index) => (
              <div key={`work-${index}`} className="rounded-xl border bg-gray-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-semibold">Work Experience {index + 1}</h4>
                  <button
                    className="text-red-600"
                    onClick={() => removeNestedListItem("career", "workExperiences", index)}
                  >
                    🗑
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Company Name", "company"],
                    ["Role", "role"],
                    ["Duration", "duration"],
                    ["Address", "address"]
                  ].map(([label, key]) => (
                    <LabeledInput key={key} label={label}>
                      <input
                        className="cc-input"
                        value={experience[key]}
                        onChange={(event) =>
                          updateNestedList(
                            "career",
                            "workExperiences",
                            index,
                            key,
                            event.target.value
                          )
                        }
                      />
                    </LabeledInput>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "skills" ? (
          <div className="space-y-4">
            <SectionTitle
              title="Skills"
              action={
                <button
                  className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600"
                  onClick={addSkill}
                >
                  + Add Skill
                </button>
              }
            />
            {profile.skills.map((skill, index) => (
              <div key={`skill-${index}`} className="rounded-xl border bg-gray-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-semibold">Skill {index + 1}</h4>
                  <button className="text-red-600" onClick={() => removeSkill(index)}>
                    🗑
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Skill Name", "skillName"],
                    ["Badge / Certification", "certification"],
                    ["Issued By", "issuedBy"]
                  ].map(([label, key]) => (
                    <LabeledInput key={key} label={label}>
                      <input
                        className="cc-input"
                        value={skill[key]}
                        onChange={(event) => updateSkill(index, key, event.target.value)}
                      />
                    </LabeledInput>
                  ))}
                  <LabeledInput label="Proficiency Level">
                    <select
                      className="cc-select"
                      value={skill.proficiencyLevel}
                      onChange={(event) =>
                        updateSkill(index, "proficiencyLevel", event.target.value)
                      }
                    >
                      <option value="">Select level</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </LabeledInput>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ProfilePage;
