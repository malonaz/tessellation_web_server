const router = require('express').Router();
const multer = require('multer');
const fs = require('fs')
const os = require('os');
const child_process = require('child_process');
const crypto = require('crypto');
const hashFile = require('./../lib/hashFile');

module.exports = router;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, os.tmpdir());
  },
  filename: function(req, file, cb){
    let buf = crypto.randomBytes(32);
    let temp_name = buf.toString('hex');
    cb(null, temp_name + '.jpg');
  },
});

function fileFilter (req, file, cb) {
  if (file.mimetype !== 'image/jpeg') {
     cb(new Error('File Upload Error'), false);
   }
   cb(null, true);
}

const upload = multer({storage : storage, fileFilter: fileFilter}).single('puzzle');

function processImage(file, hash) {
  //const executable = process.env.SOLVER_MODULE_BIN + 'demo';
  const executable = process.env.TEST_SOLVER_DIR;
  const puzzle_file = file;
  child_process.exec('"' + executable + '" "' + file + '" "' + hash + '"', function(error, stdout, stderr){
   console.log(error);
   console.log(stderr);
   console.log(stdout);
   });
   fs.writeFile(process.env.UPLOAD_DIR + '/' + hash + '/solving', "", function(err) {
     if(err) {
         return console.log(err);
     }
 });
}

function moveFileHashedRename(hash, old_filename) {
  const new_filename = 'photo.jpg';
  const dir = process.env.UPLOAD_DIR + '/' + hash + '/';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    const new_dir = dir + new_filename;
    fs.rename(old_filename, new_dir);
    processImage(new_dir, hash);
  } else {
    fs.unlink(old_filename);
  }
}

router.post('/', (req, res, next) => {
  upload(req, res, function(err){
    if(err) {
      res.status(err.status || 500).json({ "error": { "status_code": err.status || 500, "message": err.code } });
      console.log("error: " + err.code);
      return;
    } else if (!req.file) {
      return res.json({msg:'File Upload Error'})
    } else{
      const file = os.tmpdir() + '/' + req.file.filename;
      hashFile(file)
        .then((hash) => {
          moveFileHashedRename(hash, file);
          res.json({
            hash: hash
          })
        });
    }
  });
});