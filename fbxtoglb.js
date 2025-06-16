const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const convert = require('fbx2gltf');
const multer = require('multer');

const app = express();
const port = 3016; // You can change the port as needed

app.use(express.json())


const fbxDirectory = '/web/gebarenoverleg_media/fbx/';

function doesGlbExist(fbxFile) {
    const glbFile = fbxFile.replace('.fbx', '.glb');
    return fs.existsSync(fbxDirectory + '/' + glbFile);
}

function convertToFbx2Glb(fbxFile) {
    const glbFile = fbxFile.replace('.fbx', '.glb');

    return new Promise((resolve, reject) => {
        convert(fbxFile, glbFile, ['--blend-shape-normals']).then(
            (destPath) => {
                resolve(destPath);
            },
            (error) => {
                reject(error);
                console.log(error)
            }
        );
    });
}

// app.get('/:fbxFile', async (req, res) => {
//     try {
//         const fbxFile = req.params.fbxFile;

//         const fbxFilePath = fbxDirectory + '/' + fbxFile;

//         if (!fs.existsSync(fbxFilePath)) {
//             return res.status(404).json({ error: FBX file not found: ${fbxFile} });
//         }

//         if (doesGlbExist(fbxFile)) {
//             return res.status(200).json({ message: GLB file already exists for: ${fbxFile} });
//         }

//         const destPath = await convertToFbx2Glb(fbxFilePath);
//         res.status(200).json({ message: 'Conversion successful', glbPath: destPath });
//     } catch (error) {
//         res.status(500).json({ error: Internal Server Error: ${error.message} });
//     }
// });

// Set up multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, fbxDirectory);
  },
  filename: function(req, file, cb) {
    // Use the original file name
    cb(null, file.originalname);
  }
});

// Create the multer instance with the storage configuration
const upload = multer({ storage: storage });

// Define the base path from the proxy
const basePath = '/fbx2glb';

app.post(`${basePath}/upload`, upload.single('file'), async function (req, res) {
    try {
        // console.log(req) // Optional: Keep or remove logging as needed
        const avatarName = req.body.avatarName;
        if (!avatarName) {
            return res.status(400).json({ error: 'avatarName is required' });
        }

        const originalName = req.file.originalname;
        const extension = originalName.substring(originalName.lastIndexOf('.'));
        //get basename from originalname
        const basename = originalName.substring(0, originalName.lastIndexOf('.'));

        const newFilename = `${basename}_${avatarName}${extension}`;
        const newPath = `${fbxDirectory}${newFilename}`;
        fs.renameSync(req.file.path, newPath);
        console.log(newPath);
        const destPath = await convertToFbx2Glb(newPath);

        // Construct the public URL considering the base path
        const publicGlbPath = `${basePath}/${newFilename.replace('.fbx', '.glb')}`; // Assuming GLB files are served relative to the base path

        res.status(200).json({ message: 'Conversion successful', glbPath: publicGlbPath }); // Return the public path
        // console.log(req.file); // Optional: Keep or remove logging as needed
    }
    catch (error) {
        console.error("Error during upload/conversion:", error); // Log the actual error
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
});


app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});