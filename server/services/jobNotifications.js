import User from "../models/User.js";
import Notification from "../models/Notification.js";

export async function notifyMatchingCandidates(job) {
  const candidates = await User.find({
    role: "candidate",
    accountActive: true,
    profileVisible: true,
    "notificationPreferences.recommendations": { $ne: false },
  }).select("skills location preferredLocations preferredWorkModes careerInterests");
  const jobSkills = new Set((job.skills || []).map((skill) => skill.toLowerCase()));
  const recipients = candidates.filter((candidate) => {
    const candidateSkills = (candidate.skills || []).map((skill) => skill.toLowerCase());
    const skillMatch = candidateSkills.some((skill) => jobSkills.has(skill));
    const locations = candidate.preferredLocations?.length ? candidate.preferredLocations : [candidate.location].filter(Boolean);
    const locationMatch = locations.some((location) => job.location.toLowerCase().includes(location.toLowerCase()));
    const modeMatch = candidate.preferredWorkModes?.includes(job.mode);
    const interests = (candidate.careerInterests || []).some((interest) => `${job.title} ${job.category}`.toLowerCase().includes(interest.toLowerCase()));
    return skillMatch || locationMatch || modeMatch || interests;
  });
  if (recipients.length === 0) return 0;
  await Notification.insertMany(recipients.map((candidate) => ({
    user: candidate.id,
    type: "job",
    title: "A new role may fit your profile",
    message: `${job.title} at ${job.company} matches a saved profile preference.`,
    link: `/jobs/${job.id}`,
  })));
  return recipients.length;
}
