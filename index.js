import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { configDotenv } from "dotenv";
import pg from "pg";

var blogPosts = [];
var userId = "";

configDotenv();
const db = new pg.Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});

const port = 3000;
const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));

db.connect();

app.get("/home", async (req, res) => {
  blogPosts = await getBlogs();
  res.render(__dirname + "/index.ejs", {
    blogPosts: blogPosts,
    userId: userId,
  });
});

app.get("/", (req, res) => {
  res.render(__dirname + "/signin.ejs", {
    userId: userId,
  });
});

app.post("/", async (req, res) => {
  if (await signin(req.body.username, req.body.password)) {
    userId = req.body.username;
    res.redirect("/home");
  } else {
    userId = -1;
    res.render(__dirname + "/signin.ejs", {
      userId: userId,
    });
  }
});

app.get("/signup", (req, res) => {
  userId = '';
  res.render(__dirname + "/signup.ejs", {
    userId: userId,
  });
});

app.post("/signup", async (req, res) => {
  if (
    (await signup(req.body.username, req.body.password, req.body.name)) 
  ) {
    res.redirect("/");
  } else {
    userId = -1;
    res.render(__dirname + "/signup.ejs", {
      userId: userId,
    });
  }
});

app.post("/addBlog", (req, res) => {
  if (postBlog(userId, req.body.title, req.body.body)) {
    res.redirect("/home");
  } else {
    res.send("Error: Could not add post.");
  }
});

app.post("/updateBlog", async (req, res) => {
  const postDetails = await getPostById(req.body.blog_id);
  res.render(__dirname + "/updateForm.ejs", { blogPost: postDetails });
});

app.post("/uploadUpdate", (req, res) => {
  if (editBlog(req.body.blog_id, req.body.title, req.body.body)) {
    res.redirect("/home");
  } else {
    res.send("Error: Could not update post.");
  }
});

app.post("/home", (req, res) => {
  if (deleteBlog(req.body.blog_id)) {
    res.redirect("/home");
  } else {
    res.send("Error: Could not delete post.");
  }
});

app.listen(port, () => {
  console.log(`The server is running on port ${port}.`);
});

process.on("SIGINT", () => {
  db.end();
  console.log("Server closing down & ending DB connection.");
  process.exit();
});

async function getBlogs() {
  const result = await db.query("SELECT * FROM blogs");
  return result.rows;
}

async function checkUsernameNotInUse(username) {
  const result = await db.query("SELECT * FROM users WHERE user_id = $1", [
    username,
  ]);
  if (result.rowCount > 0) {
    return false;
  } else {
    return true;
  }
}

async function signup(username, password, name) {
  if (await checkUsernameNotInUse(username)) {
    try {
      const result = db.query(
        "INSERT INTO users (user_id,password,name) VALUES ($1,$2,$3)",
        [username, password, name]
      );

      if (result.rowCount > 0) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log("ERROR: data couldn't be added.");
    }
  } else {
    return false;
  }
}

async function signin(username, password) {
  try {
    const result = await db.query(
      "SELECT * FROM users WHERE user_id = $1 AND password = $2",
      [username, password]
    );
    if (result.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.log("ERROR: could not sign in.");
  }
}

async function postBlog(username, title, body) {
  try {
    const query =
      "INSERT INTO blogs (creator_name,title,body,creator_user_id)" +
      " SELECT users.name, $1, $2, users.user_id FROM users WHERE users.user_id = $3";
    const result = db.query(query, [title, body, username]);
    if (result.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("ERROR: data couldn't be added.");
  }
}

async function deleteBlog(blog_id) {
  try {
    const result = db.query("DELETE FROM blogs WHERE blog_id = $1", [
      parseInt(blog_id),
    ]);
    if (result.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("ERROR: data couldn't be added.");
  }
}

async function getPostById(blog_id) {
  const result = await db.query("SELECT * FROM blogs WHERE blog_id = $1", [
    parseInt(blog_id),
  ]);
  if (result.rowCount > 0) {
    return result.rows[0];
  } else {
    return [];
  }
}

async function editBlog(blog_id, title, body) {
  try {
    const result = db.query(
      "UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3",
      [title, body, parseInt(blog_id)]
    );
    if (result.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("ERROR: data couldn't be added.");
  }
}
