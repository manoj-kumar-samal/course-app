import { Course } from "../models/course.model.js";
import { v2 as cloudinary } from 'cloudinary';
import { Purchase } from "../models/purchase.model.js";

export const createCourse = async (req, res) => {
    const adminId = req.adminId;
    const { title, description, price } = req.body;

    try {
        if (!title || !description || !price) {
            return res.status(400).json({ errors: "All fields are required" })
        }

        const { image } = req.files
        if (!image || Object.keys(req.files).length === 0) {
            return res.status(400).json({ errors: "No file uploaded" })
        }

        const allowedFormat = ["image/png", "image/jpeg"]
        if (!allowedFormat.includes(image.mimetype)) {
            return res.status(400).json({ errors: "Invalid file format. Only PNG and JPG are allowed" })
        }

        //cloudinary
        const cloud_response = await cloudinary.uploader.upload(image.tempFilePath)
        if (!cloud_response || cloud_response.error) {
            return res.status(400).json({ errors: "Error uploading to cloudinary" })
        }

        const courseData = {
            title,
            description,
            price,
            image: {
                public_id: cloud_response.public_id,
                url: cloud_response.secure_url,
            },
            creatorId: adminId
        }
        const course = await Course.create(courseData);
        res.json({
            message: "Course created successfully",
            course
        })

    } catch (error) {
        console.log(error)
        res.status(500).json({ errors: "Error in creating course" })
    }
};

export const updateCourse = async (req, res) => {
    const adminId = req.adminId;
    const { courseId } = req.params;
    const { title, description, price } = req.body;

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ errors: "Course not found" });
        }

        let updatedImage = course.image;

        if (req.files && req.files.image) {
            const image = req.files.image;

            const allowedFormat = ["image/png", "image/jpeg"];
            if (!allowedFormat.includes(image.mimetype)) {
                return res.status(400).json({ errors: "Invalid file format. Only PNG and JPG are allowed." });
            }

            const cloud_response = await cloudinary.uploader.upload(image.tempFilePath);
            if (!cloud_response || cloud_response.error) {
                return res.status(400).json({ errors: "Image upload failed" });
            }

            updatedImage = {
                public_id: cloud_response.public_id,
                url: cloud_response.secure_url,
            };
        }

        const updatedCourse=await Course.findOneAndUpdate(
            { _id: courseId,
              creatorId: adminId },
            {
                title,
                description,
                price,
                image: updatedImage,
            }
        );
        if(!updatedCourse){
            res.status(403).json({errors: "You can't update the course"})
        }

        res.status(200).json({ message: "Course updated successfully" });
    } catch (error) {
        console.log("Error in course updating", error);
        res.status(500).json({ errors: "Error in course updating" });
    }
};


export const deleteCourse = async (req, res) => {
    const adminId = req.adminId;
    const { courseId } = req.params;

    try {
        const course = await Course.findOneAndDelete({
            _id: courseId,
            creatorId: adminId
        })
        if (!course) {
            return res.status(403).json({ errors: "You can't delete the course" })
        }
        res.status(200).json({ message: "Course deleted successfully" })
    } catch (error) {
        res.status(500).json({ errors: "Error in course deleting" })
        console.log("Error in course deleting", error)
    }
}

export const getCourses = async (req, res) => {
    try {
        const courses = await Course.find({});
        res.status(201).json({ courses })
    } catch (error) {
        console.log("Error in get courses")
        res.status(500).json({ errors: "Errors in get courses" })
    }
}

export const courseDetails = async (req, res) => {
    const { courseId } = req.params;
    try {
        const course = await Course.findById({
            _id: courseId,
        })
        if (!course) {
            res.status(404).json({ error: "Course not found" })
        }
        res.status(201).json({ course })
    } catch (error) {
        console.log("Error in course details", error);
        res.status(500).json({ errors: "Error in course details" })
    }
}

import Stripe from "stripe";
import config from "../config.js";
const stripe = new Stripe(config.STRIPE_SCRET_KEY)
console.log(config.STRIPE_SCRET_KEY);

export const buyCourse = async (req, res) => {

    const { userId } = req;
    const { courseId } = req.params;

    try {
        const course = await Course.findById(courseId)
        if (!course) {
            return res.status(404).json({ error: "Course not found" })
        }
        const existingPurchase = await Purchase.findOne({ userId, courseId })
        if (existingPurchase) {
            return res.status(400).json({ errors: "Use has already purchased this course" })
        }


        //stripe
        const amount=course.price
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types: ["card"]
        });


        
        res.status(201).json({ message: "Course purchased successfully", course, clientSecret: paymentIntent.client_secret, })
    } catch (error) {
        console.log("Error in buying ", error)
        res.status(500).json({ errors: "Errors in course buying" })
    }
}