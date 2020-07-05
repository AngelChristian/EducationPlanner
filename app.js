//jshint esversion:6
//jshint esversion:8

const express = require('express');
const app = express();
require('dotenv').config();
app.set("view engine", "ejs");
app.use(express.static('public'));
const bodyParser = require('body-parser');
var multer = require('multer');
var path = require("path");
var cloudinary = require('cloudinary');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var findOrCreate = require('mongoose-findorcreate');
var flash = require('connect-flash');
const DatauriParser = require('datauri/parser');
const swal = require('sweetalert');
const fetch = require('node-fetch');
// const opencage = require('opencage-api-client');
// var mapsdk = require('mapmyindia-sdk-nodejs');
//cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_ID,
  api_secret: process.env.API_SECRET
});

//multer for images
var Storage = multer.memoryStorage();
// var Storage = multer.diskStorage({
//   destination: "public/images/",
//   filename: function (req, file, cb) {
//     let extArray = file.mimetype.split("/");
//     let extension = extArray[extArray.length - 1];
//     cb(null, file.fieldname + '-' + Date.now()+ '.' +extension);
//   }
// });
const uploadFilter = function(req, file, cb) {
  // filter rules here
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|bmp|BMP|jfif|JFIF)$/)) {
    req.fileValidationError = 'Only image files are allowed!,go back and try again';
    return cb(new Error('Only image files are allowed!,go back and try again'), false);
  }
  cb(null, true);
};




var upload = multer({
  storage: Storage,
  fileFilter: uploadFilter
}).array('file', 3);


const port = 3000;

app.use(bodyParser.urlencoded({
  extended: false
}));
// app.use(bodyParser.json());


app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/regDb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);

const regSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: true
  },
  lname: {
    type: String,
    required: true
  },
  username: {
    type: String,
    unique: true,
    required: true
  },
  // pswrd :{
  //   type: String,
  //   required: true
  // },
  // cpswrd :{
  //   type: String,
  //   required: true
  // }

});

regSchema.plugin(passportLocalMongoose);
regSchema.plugin(findOrCreate);


var user = new mongoose.model('user', regSchema);

//passport.use(user.createStrategy());
// passport.use(new LocalStrategy(
//   function(username, password, done) {
//     User.findOne({ username: username }, function (err, user) {
//       if (err) { return done(err); }
//       if (!user) { return done(null, false); }
//       if (!user.verifyPassword(password)) { return done(null, false); }
//       return done(null, user);
//     });
//   }
// ));
passport.use(new LocalStrategy(user.authenticate()));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  user.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    user.findOrCreate({
      fname: profile.name.givenName,
      lname: profile.name.familyName,
      username: profile.emails[0].value
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

const colSchema = new mongoose.Schema({
  cname: {
    type: String,
    required: true
  },
  ccity: {
    type: String,
    required: true
  },
  cutoff: {
    type: Number,
    required: true
  },
  ratings: {
    type: Number,
    required: true
  },
  fees: {
    type: Number,
    required: true
  },
  image: [{

    type: String



  }]
  // image :[{
  //    type: String,
  //    required: true
  //  }],
});

var college = mongoose.model('college', colSchema);


app.get('/', (req, res) => {
  res.render("edu", {
    neww: ''
  });
  //res.sendFile(__dirname+'/edu.html');

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

app.get('/reg.html', (req, res) => {
  res.render('reg', {
    err: ""
  });

});





app.get('/home.html', (req, res) => {
  if (req.isAuthenticated()) {
    res.sendFile(__dirname + '/home.html');
  } else {
    res.render("edu", {
      neww: ''
    });
  }
});

app.post('/reg.html', (req, res) => {
  const fn = req.body.first_name;
  const ln = req.body.last_name;
  const e = req.body.email;
  const p = req.body.password;
  // const cp = req.body.password_confirmation;

  user.register({
    fname: fn,
    lname: ln,
    username: e
  }, req.body.password, function(err, user) {
    if (err) {
      req.flash('message', 'User Already Exist');
      res.render('reg', {
        err: req.flash('message')
      });
      console.log(err);
    } else {
      // passport.authenticate("local")(req,res,()=>{
      res.render("edu", {
        neww: ''
      });
      //   });

    }

  });
  // Value 'result' is set to false. The user could not be authenticated since the user is not active
});
// const fn = req.body.first_name;
// const ln = req.body.last_name;
// const e = req.body.email;
// const p = req.body.password;
// const cp = req.body.password_confirmation;
//
// var u1 = new user({ fname : fn,
// lname : ln,
// email : e,
// pswrd : p,
// cpswrd :cp, });
//
// //u1.save();
//
// res.redirect('/');
// });


app.post('/edu.html', (req, res) => {
  if (req.body.username == process.env.ADMIN_UN && req.body.password == process.env.ADMIN_PW) {
    var mysort = {cutoff: -1};
    college.find((err, docs) => {
      if (err) {
        console.log(err);
      } else {

        res.render('admin', {
          list: docs
        });
      }
    }).sort(mysort);
  } else {
    const user1 = new user({
      username: req.body.username,
      password: req.body.password
    });
    if (!req.body.username) {
      res.json({
        success: false,
        message: "Username was not given"
      });
    } else {

      if (!req.body.password) {
        res.json({
          success: false,
          message: "Password was not given"
        });
      } else {
        passport.authenticate('local', function(err, user1, info) {
          if (err) {
            res.json({
              success: false,
              message: err
            });
          } else {
            if (!user1) {
              req.flash('message', 'Username/Password INCORRECT');
              res.render('edu', {
                neww: req.flash('message')
              });
              //  res.json({success: false, message: 'username or password incorrect'});
            } else {

              req.login(user1, function(err) {
                if (err) {
                  res.json({
                    success: false,
                    message: err
                  });
                } else {

                  res.redirect("/home.html");
                }
              });
            }
          }
        })(req, res);
      }
    }
    //   const user1= new user ({
    //     username:req.body.username,
    //     password:req.body.password
    //   });
    //
    // req.login(user1, function(err) {
    //   if (err) { console.log(err); }
    //   else{
    //
    //     passport.authenticate("local")(req,res,()=>{
    //       res.redirect('/home.html');
    //     });
    //    }
    // });
  }
});

//old
// const logu=req.body.username;
// const logp=req.body.password;
//   if(logu==process.env.ADMIN_UN && logp==process.env.ADMIN_PW ){
//     res.sendFile(__dirname+'/admin.html');
//   }
//   else{
//   user.findOne({$and:[{email : logu} ,{pswrd : logp}]},function (err, user) {
//   if (err) {console.log(err);}
//   if(!user){
//
// return res.send("INCORRECT DATA,GO BACK");
//
//   }
// else{
//   return res.sendFile(__dirname+'/home.html');
// // return res.redirect('/home.html')
// }
// });
// }
// });


app.post('/home.html', function(req, res) {
  var a = Number(req.body.physics);
  var b = Number(req.body.chemistry);
  var c = Number(req.body.maths);
  const d = Number((a + b + c) / 3);
  const per = d;
  //var cdata=college.find({});
  //console.log(cdata);
var mysort = {cutoff: -1};

  college.find({
    cutoff: {
      $lt: per
    }
  }, function(err, college) {
    if (err) {
      console.log(err);
    } else {


      res.render("find", {
        percen: per,
        list: college
      });
      //res.render("find");,list: college
    }

  }).sort(mysort);

});



app.post('/adminadd', upload, async function(req, res) {




  var u2 = new college({
    cname: req.body.cname,
    ccity: req.body.ccity,
    cutoff: req.body.cutoff,
    ratings: req.body.ratings,
    fees: req.body.fees,
    //image :{name:req.files.filename}

  });
  for (var i = 0; i < 3; i++) {

    // for(var i=0;i<3;i++){
    //   var image = {
    //                    name: req.files[i].filename,
    //
    //                };
    //            u2.image.push(image);
    // }
    //for(var j=0;j<3;j++){
    const parser = new DatauriParser();
    const buffer = req.files[i].buffer;
    parser.format('.png', buffer);
    var result = await cloudinary.uploader.upload(parser.content);
    var image = result.secure_url;
    //var image= result.secure_url;
    u2.image.push(image);


  }
  await u2.save();
  college.find((err, docs) => {
    if (err) {
      console.log(err);
    } else {

      res.render('admin', {
        list: docs
      });
    }
  }).sort({cutoff: -1});
  //res.render('/admin');
  // res.redirect('/admin.html');
});

app.get('/adminupdate/:id', (req, res) => {
  college.findById(req.params.id, (err, docs) => {
    if (err) {
      console.log(err);
    } else {
      console.log(docs);
      res.render('adminedit', {
        cdata: docs
      });
    }
  }).sort({cutoff: -1});
});
app.post('/eset', async(req, res) => {
  console.log(req.body._id);
  await college.findOneAndUpdate({_id: req.body._id},req.body,{new:true} ,(err, doc) => {
    if (err) {
      console.log(err);
      }
    else {

      college.find((err, docs) => {
        if (err) {
          console.log(err);
        } else {

          res.render('admin', {
            list: docs
          });
        }
      }).sort({cutoff: -1});

    }
  });
});

app.get('/admincancel', (req, res) => {
  req.flash('message', 'You Are Logged Out');
  res.render('edu', {
    neww: req.flash('message')

  });
});
app.get('/admindelete/:id', async (req, res) => {
  console.log(req.params.id);
  await college.findByIdAndRemove(req.params.id, (err, doc) => {
    if (err) {
      console.log(err);
    } else {
      //res.render('admin',{list:docs});
      res.redirect('/admincancel');
    }
  });
});

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['openid', 'email', 'profile']
  }));

app.get('/auth/google/home',
  passport.authenticate('google', {
    failureRedirect: '/'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home.html');
  });

app.get('/logout', (req, res) => {
  req.logout();
  res.render("edu", {
    neww: ''
  });

});

app.post('/nearb',async(req,res)=>{
  let place = req.body.place;
  const category = req.body.category;
  if(place=='Parul Institute Of Technology,vadodara'){
    lat=22.289325;
    lng=73.363822;
  }
  else if (place=='The Maharaja Sayajirao University of Baroda') {
    lat=22.298041;
    lng=73.196995;
  }
  else if (place=='Sardar Vallabhbhai Patel Institute of Technology') {
    lat=22.468938;
    lng=73.076251;
  }
  else if (place=='Babaria Institute of Technology,vadodara') {
    lat=22.187696;
    lng=73.187851;
  }
  else if (place=='ITM Universe, Vadodara') {
    lat=22.450739;
    lng=73.354765;
  }
  else if (place=='Neotech Institute of Technology Vadodara') {
    lat=22.403477;
    lng=73.220829;
  }
  else if (place=='K. J. Institute of Engineering & Technology') {
    lat=22.565264;
    lng=73.243309;
  }
  else if (place=='Vadodara Institute of Engineering') {
    lat=22.407053;
    lng=73.306968;
  }
  else{
    lat=22.325011;
    lng=73.280850;
  }
  // await opencage.geocode({q: place}).then(data => {
  // console.log(JSON.stringify(data));
  // if (data.status.code == 200) {
  //   if (data.results.length > 0) {
  //     var place = data.results[0];
  //     console.log(place.formatted);
  //     console.log(place.geometry);
  //     console.log(place.annotations.timezone.name);
      // const lat = place.geometry.lat;
      // const lng = place.geometry.lng;
      var requestOptions = {
  method: 'GET',
  redirect: 'follow'
};

 fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&category=${category}&location=${lng},${lat}&outFields=Place_addr, PlaceName,Phone, Type&maxLocations=15`, requestOptions)
  .then(response => response.json())
  .then(result => {console.log(result);
    res.render('nearby',{list:result.candidates,lat:lat,lng:lng});
  })
  .catch(error => {console.log('error', error);
      res.redirect('/home.html');
      });

    // }
//   }
//    else {
//     console.log('error', data.status.message);
//     res.redirect('/home.html');
//   }
// }).catch(error => {
//   console.log('error', error.message);
//   res.redirect('/home.html');
// });

});
