const { RecipeModel } = require ('../models/recipe')
const { UserModel } = require('../models/user')
const cloudinary = require('../config/cloudinary-config')
const multer =  require('multer')
const streamifier = require('streamifier')
const { streamUpload } = require('../config/multer-config')
const nodemailer = require('nodemailer');


module.exports = {

    index: async (req, res, next) => {

        let recipes = []

        recipes = await RecipeModel.find()

        if(!req.user) {
            
            req.flash('success_message', 'Log In to upload your recipe, give ratings and receive comments on your own recipes! ')
            res.render('index', { success_message: req.flash('success_message'), recipes: recipes })
        } else {
            res.render('index', { recipes: recipes })
        }

        
    },

    logout: async (req, res) => {

        let recipes = []

        recipes = await RecipeModel.find()
        res.redirect('/recipes/home')
        
    },

    contact: (req, res) => {
        res.render('contact-us')
    },

    feedbackCreate: async(req, res) => {    
        const {name, email, comments} = req.body

        if(!name || !email) {
            await req.flash('error_message', 'Both Name and email address must be filled up')
            res.render('contact-us', {name: name, email: email, comments: comments, error_message: req.flash('error_message') })
        } else {

            let transport = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            
            const message = {
                from: process.env.EMAIL_ADDRESS, // User's email address
                to: process.env.EMAIL_ADDRESS,         //  my email
                subject: "Feedback From User", // Subject line
                text: `From: ${name}. Email: ${email}. Feedback: ${comments}` // Actual feedback from user
            };
 
            transport.sendMail(message, function(err, info) {
                if (err) {
                    console.log(err)
                    res.send('failed. Please retry')
                } else {
                    req.flash('success_message', 'Thank you for your feedback. We will get back to you. In the meantime')
                    res.redirect('/recipes/home')      
                }
            })
        }
    },

    new: (req, res) => {
        res.render('newform')
    },

    filter: async(req,res) => {

        let recipes = []

        recipes = await RecipeModel.find({"tags.tag": req.body.searchTagInput})
        res.render('tags', { recipes: recipes })
    },

    show: async(req, res) => {

        let recipeReq = {}
       
        let item = await RecipeModel.findOne ({_id: req.params.id})

        if (!item) {
            res.send('Not Found')
            return
        } else {

            recipeReq = item
        }
       
        let userReq = await UserModel.findOne({user_id: recipeReq.user_id})

            if(userReq) {
                res.render('show', { recipe : recipeReq ,userReq: userReq} )
            } else {
                res.render('show', { recipe : recipeReq} )
            }
            
    },

    create: async (req, res) => {

        const { name, prepared_by, newImage, cuisine, serves, difficulty, time, summary, ingredient, instructions, newTags} = req.body

        //creating an errors array to display all the errors
        let errors = []

        //ensuring all fields are filled up
        if(!name|| !cuisine || !serves || !difficulty || !time || !summary) {
            errors.push('All fields are required to be filled up.')
        }

        //showing the users the errors that preventing the registration from beign submitted
        if (errors.length > 0) {

            //re-render the registration site but keep the details in the form less password
            res.render('newform', {
                errors: errors,
                name: name,
                prepared_by: prepared_by,
                image: newImage,
                cuisine: cuisine,
                serves: serves,
                difficulty: difficulty,
                time: time,
                summary: summary,
                ingredient: ingredient,            
                instruction: instructions,
                newTags: newTags
            })

        } else {

            let newIngredient = []
        
            for (let i = 0; i < req.body.ingredient.length; i++) {
                newIngredient.push({"item":req.body.ingredient[i]})
            }   
        
            let newInstructions = []
        
            for(let i =0; i< req.body.instruction.length; i++) {
                newInstructions.push({"toDo": req.body.instruction[i]})
            }

            //splitting the tags by comma and removing any whitespace before putting into the schema format
            let tagsArray = req.body.newTags.split(',')
            let updatedTagsArray =  []

            for(let i =0; i< tagsArray.length; i++) {
                updatedTagsArray.push({"tag": tagsArray[i].trim()})
            }

           let newUpload = await streamUpload(req)

            RecipeModel.create({

                name: name,
                prepared_by: prepared_by,
                image: newUpload.secure_url,
                cloudinary_id: newUpload.public_id,
                cuisine: cuisine,
                user_id: req.user.user_id,
                serves: serves,
                difficulty: difficulty,
                time: time,
                summary: summary,
                ingredient: newIngredient,            
                instruction: newInstructions,
                website: req.user.website,
                facebook: req.user.facebook,
                instagram: req.user.instagram,
                pinterest: req.user.pinterest,
                tags: updatedTagsArray,
                created_at: Date.now(),
                updated_at: Date.now()
            })
                .then(createResp =>{        
                    res.redirect(`/user/${req.user.user_id}/dashboard`)
                })
        }
    },

    editPhotoForm: async (req, res) => {

        let updateRecipe = await RecipeModel.findById(req.params.id)
        res.render('updateRecipePhoto', {recipe: updateRecipe})
    },

    editPhoto: async (req,res) => {
        
        let updateRecipe = await RecipeModel.findById(req.params.id)

        if(updateRecipe.user_id === req.user.user_id) {


            let newUpload = await streamUpload(req)
            cloudinary.uploader.destroy(updateRecipe.cloudinary_id)

            RecipeModel.updateOne(
                { _id: req.params.id},
                {
                    $set: {
                        image: newUpload.secure_url,
                        cloudinary_id: newUpload.public_id,
                        updated_at: Date.now()
                    }
                }
            )

                .then(updatedRecipe => {
                
                    res.redirect(`/user/${req.user.user_id}/dashboard`)
                    return
                })

        } else {
            res.send('Failed update')
        }

    },

    addReview: async (req, res) => {

       let updateRecipe = await RecipeModel.updateOne(
            { _id: req.params.id},
            {
                $push: {
                    reviews: {rating: req.body.rating, comment: req.body.comment, user_id: req.user.user_id}   
                }
            }
        )
        
        res.redirect(`/recipes/${req.params.id}`)
    },

    delete: async (req, res) => {
        
        let deleteRecipe = await RecipeModel.findOne({_id: req.params.id})
        if (deleteRecipe.user_id === req.user.user_id) {
            await RecipeModel.deleteOne( {_id: req.params.id})

            if(deleteRecipe.cloudinary_id) {
                await cloudinary.uploader.destroy(deleteRecipe.cloudinary_id)
            }
            
        }
    
        res.redirect(`/user/${req.user.user_id}/dashboard`)
    
    }

}