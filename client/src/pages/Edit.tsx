import { useState } from "react";
import EditFormInput from "../components/Edit/EditFormInput";
import {
	GetAllImagesDocument,
	GetAllImagesQuery,
	GetUserDocument,
	GetUserQuery,
	MeDocument,
	MeQuery,
	useEditUserMutation,
	useMeQuery
} from "../generated/graphql";
import PhotoModalMain from "../components/Edit/PhotoModal";
import SettingsContainer from "../containers/SettingsContainer";
import styled, { keyframes } from "styled-components";
import PropTypes from "prop-types";
import SubmitButton from "../components/Edit/SubmitButton";

const SubmitButtonSection = styled.section`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 15px 0;
	@media (min-width: 800px) {
		flex-direction: row;
		justify-content: space-between;
		margin-left: 157px;
	}
`;

const DisableAccount = styled.button`
	margin: 20px 0 0 0;
	padding: 0;
	border: none;
	outline: none;
	color: #0095f6;
	font-size: 0.9rem;
	font-weight: 600;
	cursor: pointer;
	@media (min-width: 800px) {
		margin: 0;
	}
`;

interface EditProps {}

const Edit = ({}: EditProps) => {
	const { data } = useMeQuery();
	const [editUser] = useEditUserMutation();

	const [formData, setFormData] = useState({
		Name: data?.me?.fullname,
		Username: data?.me?.username,
		image_link: data?.me?.image_link,
		Website: data?.me?.website,
		Bio: data?.me?.bio,
		Email: data?.me?.email,
		Gender: data?.me?.gender,
		"Phone Number": data?.me?.phone_number,
		"Similar Account Suggestions": data?.me?.recomended!,
		Disabled: data?.me?.disabled!
	});
	const [loading, setLoading] = useState(false);
	const [updated, setUpdated] = useState(false);
	const [openModal, setOpenModal] = useState(false);

	const [imageFile, setImageFile] = useState<File | null>(null);
	const [uploadErrorMessage, setUploadErroMessage] = useState<string | null>(null);

	const Scrollbar = (arg: "show" | "hide") => {
		arg === "show"
			? (document.documentElement.style.overflowY = "visible")
			: (document.documentElement.style.overflowY = "hidden");
	};

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const res = await editUser({
				variables: {
					file: imageFile,
					name: formData.Name!,
					username: formData.Username!,
					image_link: formData.image_link!,
					email: formData.Email!,
					website: formData.Website,
					bio: formData.Bio,
					phoneNumber: Number(formData["Phone Number"]),
					gender: formData.Gender,
					similarAccountSuggestions: formData["Similar Account Suggestions"],
					disabled: formData.Disabled
				},
				update: (cache, { data }) => {
					cache.writeQuery<MeQuery>({
						query: MeDocument,
						data: {
							__typename: "Query",
							me: data?.editUser.user!
						}
					});

					const existedImages = cache.readQuery<GetAllImagesQuery>({
						query: GetAllImagesDocument,
						variables: { limit: 3, cursor: null }
					});
					if (existedImages) {
						const newImages = existedImages.getAllImages.images.map(image => {
							if (image.user.username === formData.Username) {
								return {
									...image,
									user: {
										...image.user,
										username: data?.editUser.user?.username!,
										image_link: data?.editUser.user?.image_link!
									}
								};
							}
							return image;
						});
						cache.writeQuery<GetAllImagesQuery>({
							query: GetAllImagesDocument,
							data: {
								__typename: existedImages.__typename,
								getAllImages: {
									__typename: existedImages.getAllImages.__typename,
									hasMore: existedImages.getAllImages.hasMore,
									images: newImages
								}
							}
						});
					}

					const existedUser = cache.readQuery<GetUserQuery>({
						query: GetUserDocument,
						variables: { username: formData.Username }
					});
					if (existedUser) {
						cache.writeQuery<GetUserQuery>({
							query: GetUserDocument,
							data: {
								__typename: existedUser.__typename,
								getUser: {
									__typename: existedUser.getUser.__typename,
									user: {
										__typename: existedUser.getUser.user?.__typename,
										id: existedUser.getUser.user?.id!,
										username: formData.Username!,
										fullname: formData.Name!,
										website: formData.Website,
										bio: formData.Bio,
										image_link: data?.editUser.user?.image_link || existedUser.getUser.user?.image_link!,
										images_length: existedUser.getUser.user?.images_length,
										private: existedUser.getUser.user?.private!,
										recomended: formData["Similar Account Suggestions"],
										disabled: formData.Disabled
									},
									error: {
										__typename: existedUser.getUser.error?.__typename,
										message: existedUser.getUser.error?.message!
									}
								}
							}
						});
					}
					return;
				}
			});
			if (res.data?.editUser.error) {
				console.log("Mutation Error");
			}
			if (res.data?.editUser.user) {
				setUpdated(true);
				setTimeout(() => setUpdated(false), 3000);
			}
		} catch (error) {
			console.error("503 Service Unavailable");
		}
		setLoading(false);
	};

	const activeButton = !!(formData.Name && formData.Username && formData.Email);

	return (
		<SettingsContainer
			updated={updated}
			Scrollbar={Scrollbar}
			setOpenModal={setOpenModal}
			image_url={formData.image_link}>
			{openModal && (
				<PhotoModalMain
					Scrollbar={Scrollbar}
					setOpenModal={setOpenModal}
					setFormData={setFormData}
					formData={formData}
					setImageFile={setImageFile}
					setUploadErroMessage={setUploadErroMessage}
				/>
			)}

			<form onSubmit={onSubmit}>
				<EditFormInput
					label="Name"
					description="Help people discover your account by using the name you're known by: either your full name,
								nickname, or business name."
					subDescription="You can only change your name twice within 14 days."
					formData={formData}
					setFormData={setFormData}
					value={formData.Name}
				/>
				<EditFormInput
					label="Username"
					description="In most cases, you'll be able to change your username back to top.dankest.memes for another
								14 days."
					formData={formData}
					setFormData={setFormData}
					value={formData.Username}
				/>
				<EditFormInput
					label="Website"
					formData={formData}
					setFormData={setFormData}
					value={formData.Website}
					type="url"
				/>
				<EditFormInput
					label="Bio"
					descriptionTitle="Personal Information"
					description="Provide your personal information, even if the account is used for a business, a pet or something else. This won't be a part of your public profile."
					textArea
					formData={formData}
					setFormData={setFormData}
					value={formData.Bio}
				/>
				<EditFormInput
					label="Email"
					type="email"
					formData={formData}
					setFormData={setFormData}
					value={formData.Email}
				/>
				<EditFormInput
					label="Phone Number"
					type="number"
					formData={formData}
					setFormData={setFormData}
					value={formData["Phone Number"]}
				/>
				<EditFormInput
					label="Gender"
					formData={formData}
					setFormData={setFormData}
					value={formData.Gender}
				/>
				<EditFormInput
					type="checkbox"
					label="Similar Account Suggestions"
					description="Include your account when recommending similar accounts people might want to follow."
					formData={formData}
					setFormData={setFormData}
					defaultChecked={formData["Similar Account Suggestions"]}
				/>
				<SubmitButtonSection>
					<SubmitButton active={activeButton} loading={loading} width={"90px"}>
						Submit
					</SubmitButton>
					<DisableAccount
						type="button"
						onClick={() => setFormData({ ...formData, Disabled: !formData.Disabled })}>{`${
						formData.Disabled ? "Enable" : "Temporarily disable"
					} my account`}</DisableAccount>
				</SubmitButtonSection>
			</form>
		</SettingsContainer>
	);
};

Edit.propTypes = {};

export default Edit;
