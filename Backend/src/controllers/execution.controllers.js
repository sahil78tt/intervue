import axios from "axios";

const JDOODLE_URL = "https://api.jdoodle.com/v1/execute";

const LANGUAGE_CONFIG = {
  javascript: {
    language: "nodejs",
    versionIndex: "4",
  },
  python: {
    language: "python3",
    versionIndex: "4",
  },
  cpp: {
    language: "cpp17",
    versionIndex: "1",
  },
  c: {
    language: "c",
    versionIndex: "5",
  },
  java: {
    language: "java",
    versionIndex: "4",
  },
  typescript: {
    language: "typescript",
    versionIndex: "1",
  },
};

export const executeCode = async (req, res) => {
  try {
    const { language, code } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        status: "error",
        message: "Language and code are required",
      });
    }

    // Check if we support this language
    const config = LANGUAGE_CONFIG[language];
    if (!config) {
      return res.status(400).json({
        status: "error",
        message:
          "Language not supported. Supported: " +
          Object.keys(LANGUAGE_CONFIG).join(", "),
      });
    }

    console.log("Executing:", language, "→ JDoodle:", config.language);

    const response = await axios.post(JDOODLE_URL, {
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script: code,
      language: config.language,
      versionIndex: config.versionIndex,
    });

    const result = response.data;

    return res.status(200).json({
      status: "success",
      data: {
        output: result.output,
        memory: result.memory,
        cpuTime: result.cpuTime,
        statusCode: result.statusCode,
      },
    });
  } catch (error) {
    console.log("Execute Code Error:", error.message);

    if (error.response) {
      console.log("JDoodle Error Details:", error.response.data);
      return res.status(500).json({
        status: "error",
        message: "Code execution service failed. Try again.",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

export const getSupportedLanguages = async (req, res) => {
  try {
    const languages = Object.keys(LANGUAGE_CONFIG).map(function (lang) {
      return {
        language: lang,
        jdoodleLanguage: LANGUAGE_CONFIG[lang].language,
        versionIndex: LANGUAGE_CONFIG[lang].versionIndex,
      };
    });

    return res.status(200).json({
      status: "success",
      data: { languages: languages },
    });
  } catch (error) {
    console.log("Get Languages Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};
