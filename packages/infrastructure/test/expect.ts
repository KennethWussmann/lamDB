import { Template } from 'aws-cdk-lib/assertions';

export const expectProperties = (template: Template, resourceType: string, properties: object) => {
  const resources = template.findResources(resourceType);
  expect(Object.keys(resources).length).toBeGreaterThan(0);

  const resource = resources[Object.keys(resources)[0]];
  expect(resource.Properties).toMatchObject(properties);
};
