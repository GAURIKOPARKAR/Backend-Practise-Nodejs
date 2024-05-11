import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiErrors.js";
import { User } from "../models/User.model.js";
import uploadonCloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/apiResponse.js";

const generateAccessandRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    //we dont want to validate user again as User model will get start again and we have to pass password again
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating request and response token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  if (!fullname || !email || !username || !password) {
    throw new apiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (existedUser) {
    throw new apiError(409, "User already exists");
  }

  const avatarLocalpath = req.files?.avatar?.[0]?.path;
  const coverImageLocalpath = req.files?.coverImage?.[0]?.path;
  console.log(avatarLocalpath);
  if (!avatarLocalpath) {
    throw new apiError(400, "Avatar image is compulsory");
  }

  const avatar = await uploadonCloudinary(avatarLocalpath);
  //console.log(avatar.url)
  if (!avatar || !avatar.url) {
    throw new apiError(400, "Failed to upload avatar image");
  }

  let coverImage = null;
  if (coverImageLocalpath) {
    coverImage = await uploadonCloudinary(coverImageLocalpath);
    if (!coverImage || !coverImage.url) {
      throw new apiError(400, "Failed to upload cover image");
    }
  }

  const newUser = new User({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage ? coverImage.url : "",
    username: username.toLowerCase(),
    email,
    password,
  });

  const user = await newUser.save();

  if (!user) {
    throw new apiError(500, "Error creating user");
  }

  return res.status(200).json(new apiResponse(200, user, "User is registered"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !username) {
    throw new apiError(400, "email or username is required");
  }
  //user is like an object of User model which can access methods of User model.
  const user = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });
  if (!user) {
    throw new apiError(404, "this user does not exist");
  }
  const correctPassword = await user.isPasswordCorrect(password);
  if (!correctPassword) {
    throw new apiError(401, "Incorrect Credentials");
  }
  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(user._id)
 const loggedInUser =  await User.findById(user._id).select("-password -refreshToken")

 const options = {
  httpOnly : true,
  secure: true
 }

 return res.status(200).cookie(accessToken).cookie(refreshToken).json(
   new apiResponse(
    200,
    {
      user : loggedInUser, accessToken, refreshToken
    },
    "User logged in successfully"
   )
 )

});

const logOutUser = asyncHandler(async (req, res)=>{
  
})

export { registerUser, loginUser };
