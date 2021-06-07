module.exports = {

    authenticatedOnly: (req, res, next) => {
        // if session is valid, go to the next stage
        if (req.isAuthenticated()) {
            
            return next();
        }
        
        req.flash('error_message', "Please login to proceed.")
        res.redirect('/user/login')
    },

    alreadyAuthenticated: (req, res, next) => {
        // if is not logged-in, allow request to proceed
        if (req.isAuthenticated()) {
          return res.redirect(`/user/${req.user.user_id}/dashboard`) 
        }
        next()
    },
    
    verifyUser: (req,res,next) => {


        if(req.params.user_id === req.user.user_id) {
            
            return next();

        } else {

            req.flash('error_message', "Invalid credentials")
            res.redirect('/user/login')
        }

    }

}