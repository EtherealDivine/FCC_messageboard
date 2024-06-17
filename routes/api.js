"use strict";

const mongodb = require("mongodb");
const mongoose = require("mongoose");

module.exports = function (app) {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const replySchema = new mongoose.Schema({
    text: { type: String, required: true },
    delete_password: { type: String, required: true },
    created_on: { type: Date, required: true },
    reported: { type: Boolean, required: true },
  });

  const threadSchema = new mongoose.Schema({
    text: { type: String, required: true },
    delete_password: { type: String, required: true },
    board: { type: String, required: true },
    created_on: { type: Date, required: true },
    bumped_on: { type: Date, required: true },
    reported: { type: Boolean, required: true },
    replies: [replySchema],
  });

  const Reply = mongoose.model("Reply", replySchema);
  const Thread = mongoose.model("Thread", threadSchema);

  app.post("/api/threads/:board", async (req, res) => {
    let newThread = new Thread(req.body);
    newThread.board = req.params.board;
    newThread.created_on = new Date();
    newThread.bumped_on = new Date();
    newThread.reported = false;
    newThread.replies = [];

    try {
      let savedThread = await newThread.save();
      if (savedThread) {
        return res.redirect("/b/" + savedThread.board + "/" + savedThread._id);
      }
    } catch (err) {
      console.log(err);
    }
  });

  app.post("/api/replies/:board", async (req, res) => {
    let newReply = {
      text: req.body.text,
      delete_password: req.body.delete_password,
      created_on: new Date(),
      reported: false,
    };

    try {
      let updatedThread = await Thread.findByIdAndUpdate(
        req.body.thread_id,
        { $push: { replies: newReply }, bumped_on: new Date() },
        { new: true },
      );
      if (updatedThread) {
        return res.redirect(
          "/b/" +
            updatedThread.board +
            "/" +
            updatedThread._id +
            "?new_reply_id=" +
            newReply._id,
        );
      }
    } catch (err) {
      console.log(err);
    }
  });

  /*app.get("/api/threads/:board", async (req, res) => {
    try {
      let threads = await Thread.find({ board: req.params.board })
        .sort({ bumped_on: -1 })
        .limit(10)
        .select("-delete_password -reported")
        .lean()
        .exec();

      if (threads) {
        threads.forEach((thread) => {
          thread.replycount = thread.replies.length;
          thread.replies = thread.replies
            .sort((a, b) => b.created_on - a.created_on)
            .slice(0, 3)
            .map((reply) => {
              return {
                _id: reply._id,
                text: reply.text,
                created_on: reply.created_on,
              };
            });
        });
        return res.json(threads);
      }
    } catch (err) {
      console.log(err);
    }
  });*/
  app.get("/api/threads/:board", async (req, res) => {
    try {
      let threads = await Thread.find({ board: req.params.board })
        .sort({ bumped_on: -1 })
        .limit(10)
        .select("_id text created_on bumped_on replies")
        .lean()
        .exec();

      if (threads) {
        threads.forEach((thread) => {
          thread.replycount = thread.replies.length;
          thread.replies.sort((a, b) => b.created_on - a.created_on);
          thread.replies = thread.replies.slice(0, 3);
          thread.replies = thread.replies.map((reply) => {
            return {
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on,
            };
          });
        });
        console.log("Threads response:", threads); // Add logging
        return res.json(threads);
      }
    } catch (err) {
      console.log(err);
    }
  });

  app.get("/api/replies/:board", async (req, res) => {
    try {
      let thread = await Thread.findById(req.query.thread_id);
      if (thread) {
        thread.delete_password = undefined;
        thread.reported = undefined;
        thread.replycount = thread.replies.length;
        thread.replies.sort((a, b) => b.created_on - a.created_on);
        thread.replies.forEach((reply) => {
          reply.delete_password = undefined;
          reply.reported = undefined;
        });
        return res.json(thread);
      } else {
        return res.send("Thread not found");
      }
    } catch (err) {
      console.log(err);
    }
  });

  app.delete("/api/threads/:board", async (req, res) => {
    try {
      let thread = await Thread.findById(req.body.thread_id);
      if (thread) {
        if (thread.delete_password === req.body.delete_password) {
          await Thread.findByIdAndDelete(req.body.thread_id);
          return res.send("success");
        } else {
          return res.send("incorrect password");
        }
      } else {
        return res.send("Thread not found");
      }
    } catch (err) {
      console.log(err);
    }
  });

  app.delete("/api/replies/:board", async (req, res) => {
    try {
      let thread = await Thread.findById(req.body.thread_id);
      if (thread) {
        let reply = thread.replies.id(req.body.reply_id);
        if (reply) {
          if (reply.delete_password === req.body.delete_password) {
            reply.text = "[deleted]";
            let updatedThread = await thread.save();
            if (updatedThread) {
              return res.send("success");
            }
          } else {
            return res.send("incorrect password");
          }
        } else {
          return res.send("Reply not found");
        }
      } else {
        return res.send("Thread not found");
      }
    } catch (err) {
      console.log(err);
    }
  });

  app.put("/api/threads/:board", async (req, res) => {
    try {
      let thread = await Thread.findByIdAndUpdate(
        req.body.thread_id,
        { reported: true },
        { new: true },
      );
      if (thread) {
        return res.send("reported");
      } else {
        return res.send("Thread not found");
      }
    } catch (err) {
      console.log(err);
    }
  });

  app.put("/api/replies/:board", async (req, res) => {
    try {
      let thread = await Thread.findById(req.body.thread_id);
      if (thread) {
        let reply = thread.replies.id(req.body.reply_id);
        if (reply) {
          reply.reported = true;
          let updatedThread = await thread.save();
          if (updatedThread) {
            return res.send("reported");
          }
        } else {
          return res.send("Reply not found");
        }
      } else {
        return res.send("Thread not found");
      }
    } catch (err) {
      console.log(err);
    }
  });
};
