// Set up test environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';

// Mock uuid module for Jest
let counter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    const id = counter++;
    // Generate a valid UUID v4 format
    return `${id.toString().padStart(8, '0')}-0000-4000-8000-${id.toString().padStart(12, '0')}`;
  }),
}));
