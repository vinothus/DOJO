export type JwtPayload = {
  sub: string;
  email: string;
  /** Present on tokens issued after this field was added */
  name?: string;
  roles: string[];
};
