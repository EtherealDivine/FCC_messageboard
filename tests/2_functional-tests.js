const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  let testThreadId;
  let testReplyId;
  let testPass = "testpass";

  test("Create a New Thread", (done) => {
    chai
      .request(server)
      .post("/api/threads/test")
      .send({
        board: "test",
        text: "Functional Test Thread",
        delete_password: testPass,
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        let createdThreadId =
          res.redirects[0].split("/")[res.redirects[0].split("/").length - 1];
        testThreadId = createdThreadId;
        done();
      });
  });

  test("Reply to a Thread", (done) => {
    chai
      .request(server)
      .post("/api/replies/test")
      .send({
        thread_id: testThreadId,
        text: "Functional Test Reply",
        delete_password: testPass,
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        let createdReplyId = res.redirects[0].split("=")[1];
        testReplyId = createdReplyId;
        done();
      });
  });

  test("Get the most recent 10 bumped threads with the most recent 3 replies", (done) => {
    chai
      .request(server)
      .get("/api/threads/test")
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body, "response should be an array");
        assert.isAtMost(
          res.body.length,
          10,
          "array should contain at most 10 threads",
        );

        res.body.forEach((thread) => {
          assert.property(thread, "_id");
          assert.property(thread, "text");
          assert.property(thread, "createdon_");
          assert.property(thread, "bumpedon_");
          assert.notProperty(thread, "reported");
          assert.notProperty(thread, "delete_password");
          assert.isArray(thread.replies, "replies should be an array");
          assert.isAtMost(
            thread.replies.length,
            3,
            "replies array should contain at most 3 replies",
          );

          thread.replies.forEach((reply) => {
            assert.property(reply, "_id");
            assert.property(reply, "text");
            assert.property(reply, "createdon_");
            assert.notProperty(reply, "reported");
            assert.notProperty(reply, "delete_password");
          });
        });

        done();
      });
  });

  test("Get a thread with all its replies", (done) => {
    chai
      .request(server)
      .get(`/api/replies/test?thread_id=${testThreadId}`)
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isObject(res.body, "response should be an object");
        assert.property(res.body, "_id");
        assert.property(res.body, "text");
        assert.property(res.body, "createdon_");
        assert.property(res.body, "bumpedon_");
        assert.notProperty(res.body, "reported");
        assert.notProperty(res.body, "delete_password");
        assert.isArray(res.body.replies, "replies should be an array");

        res.body.replies.forEach((reply) => {
          assert.property(reply, "_id");
          assert.property(reply, "text");
          assert.property(reply, "createdon_");
          assert.notProperty(reply, "reported");
          assert.notProperty(reply, "delete_password");
        });

        done();
      });
  });
});
