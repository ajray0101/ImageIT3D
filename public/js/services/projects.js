// Project library client for the server's /api/projects routes (server/routes/projects.js).
// A project stores the spec, settings and listing. Imported meshes are not saved yet.
import { api } from "./api.js";

export const listProjects = () => api("/api/projects");
export const getProject = id => api(`/api/projects/${encodeURIComponent(id)}`);
export const createProject = data => api("/api/projects", { method: "POST", body: data });
export const updateProject = (id, data) => api(`/api/projects/${encodeURIComponent(id)}`, { method: "PUT", body: data });
export const deleteProject = id => api(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
