export const register = async (req, res) => {
  const { fullName, email, password } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }
};

export const login = async (req, res) => {};

export const logout = async (req, res) => {};

export const me = async (req, res) => {};
