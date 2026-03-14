function parseJsonField(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function buildDisplayName(user) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.username;
}

function normalizeUserModel(input) {
  if (!input) {
    return null;
  }

  const row = typeof input.get === "function" ? input.get({ plain: true }) : input;

  return {
    id: row.id,
    username: row.username,
    userIdentifier: row.userIdentifier,
    email: row.email,
    passwordHash: row.passwordHash,
    firstName: row.firstName || "",
    lastName: row.lastName || "",
    bio: row.bio || "",
    dob: row.dob ? new Date(row.dob).toISOString().slice(0, 10) : "",
    gender: row.gender || "",
    phoneNumber: row.phoneNumber || "",
    alternatePhone: row.alternatePhone || "",
    course: row.course || "",
    branch: row.branch || "",
    admissionYear: row.admissionYear || "",
    examPrep: row.examPrep || "no",
    examType: row.examType || "",
    otherExam: row.otherExam || "",
    internships: parseJsonField(row.internships, []),
    projects: parseJsonField(row.projects, []),
    workExperiences: parseJsonField(row.workExperiences, []),
    skills: parseJsonField(row.skills, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toSessionUser(user) {
  return {
    id: user.id,
    username: user.username,
    userIdentifier: user.userIdentifier,
    email: user.email,
    displayName: buildDisplayName(user),
    course: user.course,
    branch: user.branch,
    admissionYear: user.admissionYear,
    examPrep: user.examPrep
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: buildDisplayName(user),
    bio: user.bio,
    course: user.course,
    branch: user.branch,
    admissionYear: user.admissionYear,
    examPrep: user.examPrep,
    examType: user.otherExam || user.examType || "",
    internships: user.internships,
    projects: user.projects,
    workExperiences: user.workExperiences,
    skills: user.skills
  };
}

function toEditableProfile(user) {
  return {
    id: user.id,
    username: user.username,
    userIdentifier: user.userIdentifier,
    personal: {
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      dob: user.dob,
      gender: user.gender,
      phoneNumber: user.phoneNumber,
      alternatePhone: user.alternatePhone,
      email: user.email
    },
    academic: {
      course: user.course,
      branch: user.branch,
      admissionYear: user.admissionYear,
      examPrep: user.examPrep,
      examType: user.examType,
      otherExam: user.otherExam,
      internships: user.internships,
      projects: user.projects
    },
    career: {
      workExperiences: user.workExperiences
    },
    skills: user.skills
  };
}

function buildProfileStatus(user) {
  return {
    basicInfo: Boolean(user.firstName && user.lastName && user.email && user.bio),
    academicDetails: Boolean(user.course && user.branch && user.admissionYear),
    careerInfo: Boolean(user.workExperiences.length || user.projects.length),
    skills: Boolean(user.skills.length)
  };
}

module.exports = {
  buildDisplayName,
  buildProfileStatus,
  normalizeUserModel,
  parseJsonField,
  toEditableProfile,
  toPublicUser,
  toSessionUser
};
