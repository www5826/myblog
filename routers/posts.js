var express = require('express');
var router = express.Router();

var PostModel = require('../models/posts');
var checkLogin = require('../middlewares/check').checkLogin;
// get /posts 所有用户或者特定用户的文章页
router.get('/',function(req,res,next){
	var author = req.query.author;

	PostModel.getPosts(author)
		.then(function(posts){
			res.render('posts',{
				posts:posts
			})
		})
		.catch(next)
});
// post /posts 发表一篇文章
router.post('/',checkLogin,function(req,res,next){
	var author = req.session.user._id;
	var title = req.fields.title;
	var content = req.fields.content;

	try{
		if(!title.length){
			throw new Error('请填写标题');
		}
		if(!content.length){
			throw new Error('请填写内容');
		}
	}catch(e){
		req.flash('error',e.message);
		return res.redirect('back');
	}

	var post = {
		author:author,
		title:title,
		content:content,
		pv:0
	}

	PostModel.create(post)
		.then(function(result){
			//此post是插入mongodb的值，包含_id
			post = result.ops[0];
			req.flash('success','发表成功');
			//发表成功后跳转到该文章页
			res.redirect('/posts/${post._id}');
		})
		.catch(next);
});

//post /posts/create 发表文章页
router.get('/create',checkLogin,function(req,res,next){
	res.render('create')
});

// get /posts/:postId 获取单独一篇的文章页
router.get('/:postId',function(req,res,next){

	var postId = req.params.postId;

	Promise.all([
		PostModel.getPostById(postId),
		PostModel.incPv(postId)
	])
	.then(function(result){
		var post = result[0];
		if(!post){
			throw new Error('该文章不存在')
		}
		res.render('post',{
			post:post
		})
	})
	.catch(next);
});

// get /posts/:postId/edit 编辑文章页
router.get('/:postId/edit',checkLogin,function(req,res,next){
	var postId = req.params.postId;
	var author = req.session.user._id;

	PostModel.getRawPostById(postId)
		.then(function(post){
			if(!post){
				throw new Error('该文章不存在');
			}
			if(author.toString() !== post.author._id.toString()){
				throw new Error('权限不足');
			}
			res.render('edit',{
				post:post
			})
		})
		.catch(next);
});

// post /posts/:postId/edit 更新一篇文章
router.post('/:postId/edit',checkLogin,function(req,res,next){
	var postId = req.params.postId;
	var author = req.session.user._id;
	var title = req.fields.title;
	var artical = req.fields.artical;

	PostModel.updatePostId(postId,author,{title:title,content:artical})
		.then(function(){
			req.flash('success','修改成功')
			res.redirect('/posts/${postId}')
		})
		.catch(next);
});

// get /posts/:postId/remove 删除一篇文章
router.get('/:postId/remove',checkLogin,function(req,res,next){
	var postId = req.params.postId;
	var userId = req.session.user._id;

	PostModel.delPostById(postId,userId)
		.then(function(){
			req.flash('success','删除文章成功');
			res.redirect('/posts');//跳转到首页
		})
});

// post /posts/:postId/comment 创建一条留言
router.get('/:postId/comment',checkLogin,function(req,res,next){
	res.send(req.flash());
});

module.exports = router;