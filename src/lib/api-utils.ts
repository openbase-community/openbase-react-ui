export const buildAppApiUrl = (
  projectId: string,
  packageName: string,
  appName: string,
  endpoint: string
): string => {
  return `/api/openbase/projects/${projectId}/packages/${packageName}/apps/${appName}/${endpoint}`;
};