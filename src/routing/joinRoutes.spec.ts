import { joinRoutes } from "./joinRoutes";

describe("joinRoutes", () => {
  it("joins the two routes together", () => {
    expect(joinRoutes("/foo", "/bar")).toBe("/foo/bar/");
  });

  it("handles base routes that end with a slash", () => {
    expect(joinRoutes("/foo/", "/bar")).toBe("/foo/bar/");
  });

  it("handles routes that do not begin with a slash", () => {
    expect(joinRoutes("/foo", "bar")).toBe("/foo/bar/");
  });

  it("handles baseRoutes that end with slash and routes that start with slash", () => {
    expect(joinRoutes("/foo/", "/bar")).toBe("/foo/bar/");
  });

  it("does not append a / if the url has a query string", () => {
    expect(joinRoutes("/foo", "/bar?baz=1")).toBe("/foo/bar/?baz=1");
  });
});
