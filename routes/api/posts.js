const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

//Post model
const Post = require('../../models/Post');

//Profile model
const Profile = require('../../models/Profile');

//Validation
const validationPostInput = require('../../validation/post');

//@route  GET api/posts/test
//@desc   Tests post route
//@access Public
router.get('/test',(req,res)=>res.json({msg:"Post Works"}));

//@route  GET api/posts
//@desc   Get posts
//@access Public
router.get('/',(req,res)=>{
  Post.find()
    .sort({date:-1})
    .then(posts=>res.json(posts))
    .catch(err => res.status(404)
    .json({nopostfound:'No posts'}));
});

//@route  GET api/posts/:id
//@desc   Get posts by id
//@access Public
router.get('/:id',(req,res)=>{
  Post.findById(req.params.id)
    .then(post=>res.json(post))
    .catch(err => res.status(404)
    .json({nopostfound:'No post found with that ID'}));
});



//@route  POST api/posts
//@desc   Create post
//@access Private
router.post('/',passport.authenticate('jwt',{session:false}),(req,res)=>{

  const {errors,isValid} = validationPostInput(req.body);

  //Check Validation
  if(!isValid){
    //If any errors, send 400 with errors object
    return res.status(400).json(errors);
  }

  const newPost = new Post({
    text:req.body.text,
    name:req.body.name,
    avatar:req.body.avatar,
    user:req.user.id
  });
  newPost.save().then(post => res.json(post))
})

//@route  DELETE api/posts/:id
//@desc   Delete posts by id
//@access private
router.delete('/:id',passport.authenticate('jwt',{session:false}),
  (req,res)=>{
    Post.findOneAndRemove({ _id:req.params.id,user:req.user.id })
      .then(post=>{
        if(post!=null){//check if post exist
          res.json({success:true})
        } else{
          res.status(404).json({nopost:"no post found with that id"})
        }
      })
      .catch(err=>
      res.status(404).json({nopost:"There was a problem deleting post.."}))

});

//@route  POST api/posts/like/:id
//@desc   like post
//@access private
router.post('/like/:id',passport.authenticate('jwt',{session:false}),
  (req,res)=>{
    Profile.findOne({user:req.user.id}).then(profile=>{
      Post.findById(req.params.id)
      .then(post=>{
        if(post.likes.filter(like => like.user.toString() === req.user.id).length>0){
            return res.status(400).json({alreadyliked:'User already liked this post'});
        }

        //Add user id to likes Array
        post.likes.unshift({user:req.user.id});
        post.save().then(post =>res.json(post));
      })
      .catch(err=>
      res.status(404).json({nopost:"There was a problem deleting post.."}))
    })
});

//@route  POST api/posts/unlike/:id
//@desc   unlike post
//@access private
router.post('/unlike/:id',passport.authenticate('jwt',{session:false}),
  (req,res)=>{
    Profile.findOne({user:req.user.id}).then(profile=>{
      Post.findById(req.params.id)
      .then(post=>{
        if(post.likes.filter(like => like.user.toString() === req.user.id).length===0){
            return res.status(400).json({notliked:'You have not yet like this post'});
        }

        //Get remove index
        const removeIndex = post.likes
            .map(item=>item.user.toString())
            .indexOf(req.user.id);
        //Splice out of Array
        post.likes.splice(removeIndex,1);

        //Save
        post.save().then(post=>res.json(post));
      })
      .catch(err=>
      res.status(404).json({nopost:"There was a problem deleting post.."}))
    })
});

//@route  POST api/posts/comment/:id
//@desc   Add comment to post
//@access private
router.post('/comment/:id',passport.authenticate('jwt',{session:false}),(req,res)=>{

  const {errors,isValid} = validationPostInput(req.body);

  //Check Validation
  if(!isValid){
    //If any errors, send 400 with errors object
    return res.status(400).json(errors);
  }

  Post.findById(req.params.id)
    .then(post =>{
      const newComment = {
        text:req.body.text,
        name:req.body.name,
        avatar:req.body.avatar,
        user:req.user.id
      }
      //Add to comments array
      post.comments.unshift(newComment);

      //Save
      post.save().then(post=>res.json(post))
    })
    .catch(err=>res.status(404).json({postnotfound:'No post found'}))
})


//@route  DELETE api/posts/comment/:id/:comment_id
//@desc   remove comment from post
//@access private
router.delete('/comment/:id/:comment_id',passport.authenticate('jwt',{session:false}),(req,res)=>{
  Post.findById(req.params.id)
    .then(post =>{
      //Check to see if comment exists
      if(
        post.comments.filter(
        comment=>comment._id.toString()===req.params.comment_id
      ).length===0){
        return res
        .status(404)
        .json({ commentnotexists:'Comment doest not exist' });
      }
      //Get remove index
      const removeIndex = post.comments
          .map(item => item._id.toString())
          .indexOf(req.params.comment_id);
      //Splice comment out of Array
      post.comments.splice(removeIndex,1);

      post.save().then(post=>res.json(post));
    })
    .catch(err=>res.status(404).json({postnotfound:'No post found'}))
})

module.exports = router;
