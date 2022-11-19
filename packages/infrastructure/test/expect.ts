import { Template } from 'aws-cdk-lib/assertions';

export const expectProperties = (template: Template, resourceType: string, properties: object) => {
  const resources = template.findResources(resourceType);
  expect(Object.keys(resources).length).toBeGreaterThan(0);

  const resource = resources[Object.keys(resources)[0]];
  expect(resource.Properties).toMatchObject(properties);
};

export const expectResource = (template: Template, resourceType: string, count = 1) => {
  const resources = template.findResources(resourceType);
  expect(Object.keys(resources)).toHaveLength(count);
};

export const findResourceProperties = (template: Template, resourceType: string, index = 0) => {
  const resources = template.findResources(resourceType);
  expect(Object.keys(template.findResources(resourceType)).length).toBeGreaterThan(index - 1);

  const resource = resources[Object.keys(resources)[index]];
  return resource.Properties;
};
