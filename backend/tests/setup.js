process.env.NODE_ENV = "test";
process.env.TZ = "UTC";

beforeEach(() => {
  jest.clearAllMocks();
});
