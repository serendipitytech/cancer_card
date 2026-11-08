// Shape of the fake session the mocked `auth()` returns. Mirrors the subset of
// the Auth.js session the route handlers actually read (`session.user.id` and
// `session.user.name`).
export type TestSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
} | null;

export type TestAuthState = {
  session: TestSession;
  activeCrewId: string | null;
};
