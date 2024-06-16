"use strict";
let mongodb = require("mongodb");
let mongoose = require("mongoose");

module.exports = function (app) {
  let uri = process.env.MONGO_URI;
  console.log("Connecting to MongoDB with URI:", uri);

  mongoose
    .connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.log("MongoDB connection error:", err));

  let replySchema = new mongoose.Schema({
    text: { type: String, required: true },
    delete_password: { type: String, required: true },
    createdon_: { type: Date, required: true },
    reported: { type: Boolean, required: true },
  });

  let threadSchema = new mongoose.Schema({
    text: { type: String, required: true },
    delete_password: { type: String, required: true },
    board: { type: String, required: true },
    createdon_: { type: Date, required: true },
    bumpedon_: { type: Date, required: true },
    reported: { type: Boolean, required: true },
    replies: [replySchema],
  });

  let Reply = mongoose.model("Reply", replySchema);
  let Thread = mongoose.model("Thread", threadSchema);

  app.post("/api/threads/:board", async (request, response) => {
    let newThread = new Thread(request.body);
    if (!newThread.board || newThread.board === "") {
      newThread.board = request.params.board;
    }
    newThread.createdon_ = new Date();
    newThread.bumpedon_ = new Date();
    newThread.reported = false;
    newThread.replies = [];

    try {
      let savedThread = await newThread.save();
      console.log("Thread saved successfully:", savedThread);
      const baseUrl = `${request.protocol}://${request.get("host")}`;
      const redirectUrl = `${baseUrl}/b/${savedThread.board}/${savedThread._id}`;
      console.log("Redirecting to:", redirectUrl);
      response.redirect(redirectUrl);
    } catch (error) {
      console.log("Error saving thread:", error);
      response.status(500).send("Error saving thread");
    }
  });

  app.post("/api/replies/:board", async (request, response) => {
    let newReply = new Reply({
      text: request.body.text,
      delete_password: request.body.delete_password,
    });
    newReply.createdon_ = new Date();
    newReply.reported = false;

    try {
      let updatedThread = await Thread.findByIdAndUpdate(
        request.body.thread_id,
        { $push: { replies: newReply }, bumpedon_: new Date() },
        { new: true },
      );

      if (updatedThread) {
        const baseUrl = `${request.protocol}://${request.get("host")}`;
        const redirectUrl = `${baseUrl}/b/${updatedThread.board}/${updatedThread._id}?new_reply_id=${newReply._id}`;
        console.log("Redirecting to:", redirectUrl);
        response.redirect(redirectUrl);
      } else {
        response.status(404).send("Thread not found");
      }
    } catch (error) {
      console.log("Error updating thread with reply:", error);
      response.status(500).send("Error updating thread with reply");
    }
  });

  // Other routes can be added here
};
